import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body: { kodeInvoice?: string } = await req.json();
    if (!body.kodeInvoice) {
        return NextResponse.json({ message: "kodeInvoice wajib diisi" }, { status: 400 });
    }

    const orders = await prisma.order.findMany({
        where: { kode_invoice: body.kodeInvoice },
        include: { orderDetail: true, pengiriman: true },
    });

    if (orders.length === 0 || orders.some((o) => o.user_id !== session.user.id)) {
        return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    if (orders.some((o) => o.status_pembayaran === "Lunas")) {
        return NextResponse.json(
            { message: "Pesanan sudah dibayar, tidak bisa dibatalkan" },
            { status: 400 }
        );
    }

    try {
        await prisma.$transaction(async (tx) => {
            let cartOrder = await tx.order.findFirst({
                where: {
                    user_id: session.user.id,
                    status_order: "Menunggu",
                    status_pembayaran: "Belum_Bayar",
                    pengiriman: null,
                },
            });

            for (const order of orders) {
                for (const detail of order.orderDetail) {
                    await tx.barang.updateMany({
                        where: { produk_id: detail.produk_id },
                        data: { stok: { increment: detail.jumlah } },
                    });
                    await tx.produk.update({
                        where: { produk_id: detail.produk_id },
                        data: { sold_count: { decrement: detail.jumlah } },
                    });

                    if (!cartOrder) {
                        cartOrder = await tx.order.create({
                            data: { user_id: session.user.id, total_harga: 0 },
                        });
                    }

                    const existing = await tx.order_Detail.findFirst({
                        where: { order_id: cartOrder.order_id, produk_id: detail.produk_id },
                    });

                    if (existing) {
                        const jumlahBaru = existing.jumlah + detail.jumlah;
                        await tx.order_Detail.update({
                            where: { order_detail_id: existing.order_detail_id },
                            data: { jumlah: jumlahBaru, subtotal: jumlahBaru * existing.harga_satuan },
                        });
                    } else {
                        await tx.order_Detail.create({
                            data: {
                                order_id: cartOrder.order_id,
                                produk_id: detail.produk_id,
                                jumlah: detail.jumlah,
                                harga_satuan: detail.harga_satuan,
                                subtotal: detail.subtotal,
                            },
                        });
                    }
                }

                if (order.pengiriman) {
                    await tx.pengiriman.delete({ where: { order_id: order.order_id } });
                }
                await tx.order_Detail.deleteMany({ where: { order_id: order.order_id } });
                await tx.order.delete({ where: { order_id: order.order_id } });
            }

            if (cartOrder) {
                const details = await tx.order_Detail.findMany({ where: { order_id: cartOrder.order_id } });
                const total = details.reduce((sum, d) => sum + d.subtotal, 0);
                await tx.order.update({ where: { order_id: cartOrder.order_id }, data: { total_harga: total } });
            }
        });

        return NextResponse.json({ message: "OK" });
    } catch (err) {
        console.error("Batalkan checkout error:", err);
        return NextResponse.json({ message: "Gagal membatalkan pesanan" }, { status: 500 });
    }
}