import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    _req: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findUnique({
        where: { order_id: orderId },
        include: { transaksi: true },
    });

    if (!order || order.user_id !== session.user.id) {
        return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const sudahAdaPembayaran = order.transaksi.some((t) => t.jenis_transaksi === "Pemasukan");
    if (sudahAdaPembayaran) {
        return NextResponse.json(
            { message: "Sudah ada pembayaran masuk untuk pesanan ini, tidak bisa dibatalkan" },
            { status: 400 }
        );
    }

    await prisma.$transaction([
        prisma.order_Detail.deleteMany({ where: { order_id: order.order_id } }),
        prisma.order.delete({ where: { order_id: order.order_id } }),
    ]);

    return NextResponse.json({
        order_id: order.order_id,
        status_order: "Dibatalkan",
        status_pembayaran: "Gagal",
    });
}