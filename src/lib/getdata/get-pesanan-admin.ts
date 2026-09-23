"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function pesananPath(smkSlug: string, jurusanSlug: string) {
    return `/dashboard/adminJurusan/${smkSlug}/${jurusanSlug}/orderManagement`;
}


export async function prosesPesananAction(
    order_id: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    await prisma.order.update({
        where: { order_id },
        data: { status_order: "Diproses" },
    });
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}


export async function kirimPesananAction(
    order_id: string,
    data: { nomor_resi: string; estimasi_tiba?: string },
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    const resiDipakai = await prisma.pengiriman.findFirst({
        where: {
            nomor_resi: data.nomor_resi,
            order_id: { not: order_id },
        },
    });
    if (resiDipakai) {
        throw new Error(`RESI_DUPLIKAT:Nomor resi "${data.nomor_resi}" sudah dipakai di pesanan lain, silakan periksa kembali`);
    }

    try {
        await prisma.$transaction(
            [
                prisma.pengiriman.update({
                    where: { order_id },
                    data: {
                        nomor_resi: data.nomor_resi,
                        estimasi_tiba: data.estimasi_tiba,
                    },
                }),
                prisma.order.update({
                    where: { order_id },
                    data: { status_order: "Dikirim" },
                }),
            ],
            { timeout: 20000, maxWait: 20000 }
        );
    } catch (err) {
        // Pengaman kedua: kalau ada race condition dan dua request lolos pengecekan
        // di atas bersamaan, constraint unik di database yang menahan duplikatnya.
        if (
            err instanceof Error &&
            "code" in err &&
            (err as { code?: string }).code === "P2002"
        ) {
            throw new Error(`RESI_DUPLIKAT:Nomor resi "${data.nomor_resi}" sudah dipakai di pesanan lain, silakan periksa kembali`);
        }
        throw err;
    }
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}


export async function tandaiDikerjakanAction(
    order_id: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    await prisma.order.update({
        where: { order_id },
        data: { status_order: "Dikirim" },
    });
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}


export async function selesaikanJasaAction(
    order_id: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    await prisma.order.update({
        where: { order_id },
        data: { status_order: "Selesai" },
    });
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}

export async function setujuiRefundAction(
    refund_id: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    const refund = await prisma.refundRequest.update({
        where: { refund_id },
        data: { status: "Disetujui" },
        select: { order_id: true },
    });

    await prisma.order.update({
        where: { order_id: refund.order_id },
        data: { status_order: "Dibatalkan" },
    });

    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}

export async function tolakRefundAction(
    refund_id: string,
    catatanAdmin: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    await prisma.refundRequest.update({
        where: { refund_id },
        data: { status: "Ditolak", catatanAdmin },
    });
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}