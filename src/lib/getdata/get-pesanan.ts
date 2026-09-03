"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const PESANAN_PATH = "/profile/pesanan";

export async function konfirmasiSelesaiPesananAction(order_id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
        where: { order_id },
        select: { user_id: true, status_order: true },
    });

    if (!order || order.user_id !== session.user.id) {
        throw new Error("Pesanan tidak ditemukan");
    }

    if (order.status_order !== "Diterima") {
        throw new Error("Pesanan belum bisa dikonfirmasi selesai");
    }

    const refundAktif = await prisma.refundRequest.findUnique({
        where: { order_id },
        select: { status: true },
    });
    if (refundAktif && (refundAktif.status === "Diajukan" || refundAktif.status === "Diproses")) {
        throw new Error("Tidak bisa dikonfirmasi selesai selagi refund masih diproses");
    }

    await prisma.order.update({
        where: { order_id },
        data: { status_order: "Selesai" },
    });

    revalidatePath(PESANAN_PATH);
}

export async function konfirmasiPesananDiterimaAction(order_id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const order = await prisma.order.findUnique({
        where: { order_id },
        select: { user_id: true, status_order: true },
    });

    if (!order || order.user_id !== session.user.id) {
        throw new Error("Pesanan tidak ditemukan");
    }

    if (order.status_order !== "Dikirim") {
        throw new Error("Pesanan belum bisa dikonfirmasi diterima");
    }

    await prisma.order.update({
        where: { order_id },
        data: { status_order: "Diterima" }, 
    });
    await prisma.pengiriman.update({
        where: { order_id },
        data: { diterima_at: new Date() },  
    });

    revalidatePath(PESANAN_PATH);
}