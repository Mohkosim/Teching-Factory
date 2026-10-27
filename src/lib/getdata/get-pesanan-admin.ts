"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    PESAN_BELUM_ADA_DP,
    PESAN_MENUNGGU_PELUNASAN,
    adminBolehMengelola,
    bolehDiselesaikan,
    type DasarPembayaranOrder,
} from "@/lib/utils/status-jasa";
import { requireRoleAction, getJurusanSession, pastikanOrderMilikJurusan, AuthzError } from "@/lib/authz";

async function otorisasiOrder(order_id: string) {
    const session = await requireRoleAction(["AdminJurusan"]);
    const jurusan = await getJurusanSession(session.user.id);
    await pastikanOrderMilikJurusan(order_id, jurusan.jurusan_id);
    return { session, jurusan };
}

async function otorisasiRefund(refund_id: string) {
    const refund = await prisma.refundRequest.findUnique({
        where: { refund_id },
        select: { refund_id: true, order_id: true, status: true, alasan: true },
    });
    if (!refund) throw new AuthzError("Refund tidak ditemukan", 404);
    const ctx = await otorisasiOrder(refund.order_id);
    return { refund, ...ctx };
}

async function ambilDasarPembayaran(order_id: string): Promise<DasarPembayaranOrder> {
    const order = await prisma.order.findUnique({
        where: { order_id },
        include: {
            transaksi: { where: { jenis_transaksi: "Pemasukan", status_settlement: "Selesai" }, select: { nominal: true } },
            orderDetail: { include: { produk: { include: { jasa: true } } } },
        },
    });
    if (!order) throw new Error("Pesanan tidak ditemukan");
    const jasa = order.orderDetail[0]?.produk.jasa.length ? true : false;
    return {
        kategori: jasa ? "Jasa" : "Produk",
        statusPembayaran: order.status_pembayaran,
        totalHarga: order.total_harga,
        totalDibayar: order.transaksi.reduce((s, t) => s + t.nominal, 0),
    };
}

async function pastikanBolehDikelola(order_id: string) {
    const dasar = await ambilDasarPembayaran(order_id);
    if (!adminBolehMengelola(dasar)) {
        throw new Error(dasar.kategori === "Jasa" ? PESAN_BELUM_ADA_DP : "Pesanan belum dibayar lunas");
    }
}

function pesananPath(smkSlug: string, jurusanSlug: string) {

    const aman = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");
    return `/dashboard/adminJurusan/${aman(smkSlug)}/${aman(jurusanSlug)}/orderManagement`;
}

async function pastikanStatusOrder(order_id: string, boleh: string[], pesan: string) {
    const o = await prisma.order.findUnique({ where: { order_id }, select: { status_order: true } });
    if (!o || !boleh.includes(o.status_order)) throw new Error(pesan);
}

export async function prosesPesananAction(
    order_id: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    await otorisasiOrder(order_id);
    await pastikanBolehDikelola(order_id);
    await pastikanStatusOrder(order_id, ["Menunggu", "Diproses"], "Status pesanan tidak dapat diproses");
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
    await otorisasiOrder(order_id);
    await pastikanBolehDikelola(order_id);
    await pastikanStatusOrder(order_id, ["Diproses", "Dikirim"], "Pesanan harus diproses dulu sebelum dikirim");

    const resi = String(data.nomor_resi ?? "").trim();
    if (!resi || resi.length > 64) {
        throw new Error("Nomor resi tidak valid");
    }

    const resiDipakai = await prisma.pengiriman.findFirst({
        where: {
            nomor_resi: resi,
            order_id: { not: order_id },
        },
    });
    if (resiDipakai) {
        throw new Error(`RESI_DUPLIKAT:Nomor resi "${resi}" sudah dipakai di pesanan lain, silakan periksa kembali`);
    }

    try {
        await prisma.$transaction(
            [
                prisma.pengiriman.update({
                    where: { order_id },
                    data: {
                        nomor_resi: resi,
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
        if (
            err instanceof Error &&
            "code" in err &&
            (err as { code?: string }).code === "P2002"
        ) {
            throw new Error(`RESI_DUPLIKAT:Nomor resi "${resi}" sudah dipakai di pesanan lain, silakan periksa kembali`);
        }
        throw err;
    }
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}


export async function tandaiDikerjakanAction(
    order_id: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    await otorisasiOrder(order_id);
    await pastikanBolehDikelola(order_id);
    await pastikanStatusOrder(order_id, ["Menunggu", "Diproses", "Dikirim"], "Status pesanan tidak dapat diubah");
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
    await otorisasiOrder(order_id);
    if (!bolehDiselesaikan(await ambilDasarPembayaran(order_id))) {
        throw new Error(PESAN_MENUNGGU_PELUNASAN);
    }
    await pastikanStatusOrder(order_id, ["Menunggu", "Diproses", "Dikirim", "Diterima"], "Status pesanan tidak dapat diselesaikan");
    const klaim = await prisma.order.updateMany({
        where: { order_id, status_order: { not: "Selesai" } },
        data: { status_order: "Selesai" },
    });
    if (klaim.count === 1) {
        const detail = await prisma.order_Detail.findMany({ where: { order_id }, select: { produk_id: true } });
        await prisma.jasa.updateMany({
            where: { produk_id: { in: detail.map((d) => d.produk_id) } },
            data: { total_project: { increment: 1 } },
        });
    }
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}


export async function setujuiRefundAction(
    refund_id: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    const { refund } = await otorisasiRefund(refund_id);

    if (refund.status === "Disetujui" || refund.status === "Dikembalikan" || refund.status === "Ditolak") {
        throw new Error("Refund ini sudah diputuskan sebelumnya");
    }

    await prisma.$transaction(async (tx) => {
        const klaim = await tx.refundRequest.updateMany({
            where: { refund_id, status: { in: ["Diajukan", "Diproses"] } },
            data: { status: "Disetujui" },
        });
        if (klaim.count === 0) throw new Error("Refund ini sudah diputuskan sebelumnya");
        await tx.order.update({ where: { order_id: refund.order_id }, data: { status_order: "Dibatalkan" } });
    });

    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}

export async function tolakRefundAction(
    refund_id: string,
    catatanAdmin: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    const { refund } = await otorisasiRefund(refund_id);
    if (refund.status === "Disetujui" || refund.status === "Dikembalikan" || refund.status === "Ditolak") {
        throw new Error("Refund ini sudah diputuskan sebelumnya");
    }
    const catatan = String(catatanAdmin ?? "").trim().slice(0, 1000);
    if (!catatan) throw new Error("Catatan penolakan wajib diisi");

    await prisma.refundRequest.update({
        where: { refund_id },
        data: { status: "Ditolak", catatanAdmin: catatan },
    });
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
}

export async function tandaiDanaDikembalikanAction(
    refund_id: string,
    slugs: { smkSlug: string; jurusanSlug: string }
) {
    await otorisasiRefund(refund_id);

    const hasil = await prisma.refundRequest.updateMany({
        where: { refund_id, status: "Disetujui" },
        data: { status: "Dikembalikan" },
    });
    if (hasil.count === 0) {
        throw new Error("Refund belum disetujui atau dana sudah ditandai dikembalikan");
    }
    revalidatePath(pesananPath(slugs.smkSlug, slugs.jurusanSlug));
    revalidatePath("/profile/pesanan");
}
