import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MetodePembayaran } from "@/generated/prisma/enums";

interface TambahPembayaranPayload {
    orderId: string;
    nominal: number;
    metode: string;
    bukti?: string;
}

function mapMetodeKeEnum(metode: string): MetodePembayaran {
    const m = metode.toUpperCase();
    if (m.includes("QRIS")) return "QRIS";
    if (m.includes("COD")) return "COD";
    if (m.includes("WALLET") || m.includes("OVO") || m.includes("GOPAY") || m.includes("DANA") || m.includes("SHOPEEPAY")) {
        return "E_Wallet";
    }
    return "Transfer";
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body: TambahPembayaranPayload = await req.json();

    if (!body.orderId || !body.nominal || !body.metode) {
        return NextResponse.json({ message: "Data pembayaran tidak lengkap" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
        where: { order_id: body.orderId },
        include: { transaksi: true },
    });

    if (!order || order.user_id !== session.user.id) {
        return NextResponse.json({ message: "Order tidak ditemukan" }, { status: 404 });
    }

    const metodeEnum = mapMetodeKeEnum(body.metode);

    try {
        const transaksi = await prisma.$transaction(async (tx) => {
            const trx = await tx.transaksi.create({
                data: {
                    order_id: order.order_id,
                    user_id: session.user.id,
                    jenis_transaksi: "Pemasukan",
                    nominal: body.nominal,
                    metode: metodeEnum,
                    bukti: body.bukti,
                },
            });

            // Total semua transaksi "Pemasukan" yang sudah masuk untuk order ini (termasuk yang baru dibuat)
            const totalMasuk =
                order.transaksi
                    .filter((t) => t.jenis_transaksi === "Pemasukan")
                    .reduce((sum, t) => sum + t.nominal, 0) + body.nominal;

            await tx.order.update({
                where: { order_id: order.order_id },
                data: {
                    // >= total_harga -> Lunas. Kalau baru sebagian (kasus DP untuk Jasa) -> Menunggu_Konfirmasi
                    status_pembayaran: totalMasuk >= order.total_harga ? "Lunas" : "Menunggu_Konfirmasi",
                },
            });

            return trx;
        });

        return NextResponse.json({ transaksiId: transaksi.transaksi_id });
    } catch (err) {
        console.error("Tambah pembayaran error:", err);
        return NextResponse.json({ message: "Gagal menyimpan pembayaran" }, { status: 500 });
    }
}