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
    await prisma.$transaction([
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
    ]);
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