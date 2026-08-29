import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";
import { encodeCicilanOrderId } from "@/lib/utils/invoice";

interface TambahPembayaranPayload {
    orderId: string;
    nominal: number;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body: TambahPembayaranPayload = await req.json();
    if (!body.orderId || !body.nominal || body.nominal <= 0) {
        return NextResponse.json({ message: "Data pembayaran tidak lengkap" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
        where: { order_id: body.orderId },
        include: { transaksi: true },
    });

    if (!order || order.user_id !== session.user.id) {
        return NextResponse.json({ message: "Order tidak ditemukan" }, { status: 404 });
    }

    const sudahDibayar = order.transaksi
        .filter((t) => t.jenis_transaksi === "Pemasukan")
        .reduce((sum, t) => sum + t.nominal, 0);
    const sisaTagihan = order.total_harga - sudahDibayar;

    if (body.nominal > sisaTagihan) {
        return NextResponse.json(
            { message: `Nominal melebihi sisa tagihan (Rp ${sisaTagihan.toLocaleString("id-ID")})` },
            { status: 400 }
        );
    }

    const midtransOrderId = encodeCicilanOrderId(order.order_id);

    try {
        const midtransResponse = await snap.createTransaction({
            transaction_details: {
                order_id: midtransOrderId,
                gross_amount: body.nominal,
            },
        });

        return NextResponse.json({ snapToken: midtransResponse.token });
    } catch (err) {
        console.error("Gagal membuat transaksi Snap untuk cicilan:", err);
        return NextResponse.json({ message: "Gagal memproses pembayaran" }, { status: 500 });
    }
}