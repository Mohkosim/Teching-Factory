import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { produkId, namaPelanggan, tanggal, nominalBayar } = body as {
        produkId?: string;
        namaPelanggan?: string;
        tanggal?: string;
        nominalBayar?: number;
    };

    if (!produkId || !namaPelanggan || !tanggal || !nominalBayar) {
        return NextResponse.json({ message: "Data tidak lengkap" }, { status: 400 });
    }

    const produk = await prisma.produk.findUnique({
        where: { produk_id: produkId },
        include: { jasa: true },
    });

    if (!produk || produk.jasa.length === 0) {
        return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
    }

    if (nominalBayar <= 0 || nominalBayar > produk.harga) {
        return NextResponse.json(
            { message: `Nominal pembayaran harus antara Rp 1 - Rp ${produk.harga.toLocaleString("id-ID")}` },
            { status: 400 }
        );
    }

    const kodeInvoice = `INV-JASA-${Date.now()}`;

    const order = await prisma.order.create({
        data: {
            user_id: session.user.id,
            kode_invoice: kodeInvoice,
            total_harga: produk.harga,
            status_order: "Menunggu",
            status_pembayaran: "Menunggu_Konfirmasi",
            orderDetail: {
                create: {
                    produk_id: produk.produk_id,
                    jumlah: 1,
                    harga_satuan: produk.harga,
                    subtotal: produk.harga,
                },
            },
        },
    });

    const midtransOrderId = `JASA-${order.order_id}`;

    try {
        const midtransResponse = await snap.createTransaction({
            transaction_details: {
                order_id: midtransOrderId,
                gross_amount: nominalBayar,
            },
            customer_details: { first_name: namaPelanggan },
        });

        return NextResponse.json({
            orderId: order.order_id,
            kodeInvoice,
            snapToken: midtransResponse.token,
        });
    } catch (err) {
        console.error("Gagal membuat transaksi Snap untuk jasa:", err);
        await prisma.order.delete({ where: { order_id: order.order_id } });
        return NextResponse.json({ message: "Gagal membuat transaksi pembayaran" }, { status: 500 });
    }
}