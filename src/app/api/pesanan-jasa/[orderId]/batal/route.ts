import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matikanTransaksiMidtrans } from "@/lib/order/batal-checkout";

const HASIL_BATAL = { status_order: "Dibatalkan", status_pembayaran: "Gagal" } as const;

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

    if (!order.kode_invoice?.startsWith("INV-JASA-")) {
        return NextResponse.json({ message: "Pesanan ini bukan pesanan jasa" }, { status: 400 });
    }

    if (order.status_order === "Dibatalkan") {
        return NextResponse.json({ order_id: order.order_id, ...HASIL_BATAL });
    }

    const sudahAdaPembayaran = order.transaksi.some((t) => t.jenis_transaksi === "Pemasukan");
    if (sudahAdaPembayaran) {
        return NextResponse.json(
            { message: "Sudah ada pembayaran masuk untuk pesanan ini, tidak bisa dibatalkan" },
            { status: 400 }
        );
    }

    if (order.status_order !== "Menunggu") {
        return NextResponse.json(
            { message: "Pesanan sudah diproses, tidak bisa dibatalkan" },
            { status: 400 }
        );
    }

    const midtrans = await matikanTransaksiMidtrans(`JASA-${order.order_id}`);
    if (!midtrans.ok) {
        return NextResponse.json({ message: midtrans.message }, { status: midtrans.status });
    }

    const hasil = await prisma.order.updateMany({
        where: {
            order_id: order.order_id,
            user_id: session.user.id,
            status_order: "Menunggu",
            transaksi: { none: { jenis_transaksi: "Pemasukan" } },
        },
        data: HASIL_BATAL,
    });

    if (hasil.count !== 1) {
        return NextResponse.json(
            { message: "Status pesanan berubah, muat ulang halaman lalu coba lagi" },
            { status: 409 }
        );
    }

    return NextResponse.json({ order_id: order.order_id, ...HASIL_BATAL });
}
