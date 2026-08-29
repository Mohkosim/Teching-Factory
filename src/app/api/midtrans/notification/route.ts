import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";
import type { MetodePembayaran, StatusPembayaran } from "@/generated/prisma/enums";
import { decodeCicilanOrderId } from "@/lib/utils/invoice";

interface MidtransNotification {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    transaction_status: string;
    fraud_status?: string;
    payment_type: string;
}

function verifikasiSignature(body: MidtransNotification): boolean {
    const expected = crypto
        .createHash("sha512")
        .update(body.order_id + body.status_code + body.gross_amount + process.env.MIDTRANS_SERVER_KEY)
        .digest("hex");
    return expected === body.signature_key;
}

function mapPaymentTypeKeEnum(paymentType: string): MetodePembayaran {
    if (paymentType === "qris") return "QRIS";
    if (paymentType.includes("gopay") || paymentType.includes("shopeepay")) return "E_Wallet";
    if (paymentType === "cstore") return "COD";
    return "Transfer";
}

const SUKSES = ["capture", "settlement"];
const GAGAL = ["deny", "cancel", "expire", "failure"];

export async function POST(req: Request) {
    let body: MidtransNotification;
    try {
        body = await req.json();
        console.log("BODY DARI MIDTRANS:", JSON.stringify(body, null, 2));
    } catch {
        return NextResponse.json({ message: "Body tidak valid" }, { status: 400 });
    }

    if (!body.order_id || !body.signature_key) {
        console.log("VALIDASI GAGAL — order_id:", body.order_id, "signature_key:", body.signature_key)
        return NextResponse.json({ message: "Payload tidak lengkap" }, { status: 400 });
    }

    if (!verifikasiSignature(body)) {
        return NextResponse.json({ message: "Signature tidak valid" }, { status: 403 });
    }

    let statusResponse;
    try {
        statusResponse = await coreApi.transaction.status(body.order_id);
    } catch (err) {
        console.error("Gagal ambil status transaksi Midtrans (order mungkin tidak ada/dummy):", err);
        return NextResponse.json({ message: "OK — status tidak ditemukan, notifikasi diabaikan" });
    }

    const transactionStatus = statusResponse.transaction_status as string;
    const fraudStatus = statusResponse.fraud_status as string | undefined;

    const berhasil = SUKSES.includes(transactionStatus) && (fraudStatus === undefined || fraudStatus === "accept");
    const gagal = GAGAL.includes(transactionStatus);

    if (!berhasil && !gagal) {
        // status "pending" atau lainnya -> belum ada yang perlu diubah
        return NextResponse.json({ message: "OK" });
    }

    const midtransOrderId = body.order_id;
    const nominal = Math.round(Number(statusResponse.gross_amount));
    const metodeEnum = mapPaymentTypeKeEnum(body.payment_type);

    try {
        if (midtransOrderId.startsWith("CICIL-")) {
            await prosesCicilan(midtransOrderId, nominal, metodeEnum, berhasil);
        } else if (midtransOrderId.startsWith("JASA-")) {
            await prosesJasaBooking(midtransOrderId, nominal, metodeEnum, berhasil);
        } else {
            // sisanya: checkout produk, order_id Midtrans = kodeInvoice
            await prosesCheckoutProduk(midtransOrderId, metodeEnum, berhasil);
        }
    } catch (err) {
        console.error("Webhook error:", err);
        return NextResponse.json({ message: "Gagal memproses notifikasi" }, { status: 500 });
    }

    return NextResponse.json({ message: "OK" });
}

// ==== Cicilan/pelunasan jasa: order_id format CICIL-<orderId>-<timestamp> ====
async function prosesCicilan(midtransOrderId: string, nominal: number, metode: MetodePembayaran, berhasil: boolean) {
    if (!berhasil) return;

    // Cegah duplikasi kalau Midtrans kirim notifikasi yang sama lebih dari sekali
    const sudahAda = await prisma.transaksi.findFirst({
        where: { kode_pembayaran: midtransOrderId },
    });
    if (sudahAda) return;

    const orderId = decodeCicilanOrderId(midtransOrderId);

    const order = await prisma.order.findUnique({ where: { order_id: orderId }, include: { transaksi: true } });
    if (!order) return;

    await prisma.$transaction(async (tx) => {
        await tx.transaksi.create({
            data: {
                order_id: order.order_id,
                user_id: order.user_id,
                jenis_transaksi: "Pemasukan",
                nominal,
                metode,
                kode_pembayaran: midtransOrderId,
            },
        });

        const totalMasuk =
            order.transaksi
                .filter((t) => t.jenis_transaksi === "Pemasukan")
                .reduce((sum, t) => sum + t.nominal, 0) + nominal;

        const lunas = totalMasuk >= order.total_harga;

        await tx.order.update({
            where: { order_id: order.order_id },
            data: {
                status_pembayaran: (lunas ? "Lunas" : "Menunggu_Konfirmasi") as StatusPembayaran,
            },
        });
    });
}

// ==== Booking jasa awal: order_id format JASA-<orderId> ====
async function prosesJasaBooking(midtransOrderId: string, nominal: number, metode: MetodePembayaran, berhasil: boolean) {
    const orderId = midtransOrderId.replace("JASA-", "");
    const order = await prisma.order.findUnique({
        where: { order_id: orderId },
        include: { transaksi: true },
    });
    if (!order) return;

    if (!berhasil) {
        await prisma.order.update({ where: { order_id: orderId }, data: { status_pembayaran: "Gagal" } });
        return;
    }

    // Cegah duplikasi kalau Midtrans kirim notifikasi yang sama lebih dari sekali
    const sudahAda = order.transaksi.some((t) => t.kode_pembayaran === midtransOrderId);
    if (sudahAda) return;

    await prisma.$transaction(async (tx) => {
        await tx.transaksi.create({
            data: {
                order_id: orderId,
                user_id: order.user_id,
                jenis_transaksi: "Pemasukan",
                nominal,
                metode,
                kode_pembayaran: midtransOrderId,
            },
        });

        const totalMasuk =
            order.transaksi
                .filter((t) => t.jenis_transaksi === "Pemasukan")
                .reduce((sum, t) => sum + t.nominal, 0) + nominal;

        const lunas = totalMasuk >= order.total_harga;

        await tx.order.update({
            where: { order_id: orderId },
            data: {
                status_pembayaran: (lunas ? "Lunas" : "Menunggu_Konfirmasi") as StatusPembayaran,
                status_order: lunas ? "Diproses" : order.status_order,
            },
        });
    });
}

// ==== Checkout produk: order_id Midtrans = kodeInvoice, bisa mencakup beberapa Order (per toko) ====
async function prosesCheckoutProduk(kodeInvoice: string, metode: MetodePembayaran, berhasil: boolean) {
    const orders = await prisma.order.findMany({ where: { kode_invoice: kodeInvoice } });
    if (orders.length === 0) return;

    if (!berhasil) {
        await prisma.order.updateMany({
            where: { kode_invoice: kodeInvoice },
            data: { status_pembayaran: "Gagal" },
        });
        return;
    }

    await prisma.$transaction(
        orders.flatMap((order) => [
            prisma.transaksi.create({
                data: {
                    order_id: order.order_id,
                    user_id: order.user_id,
                    jenis_transaksi: "Pemasukan",
                    nominal: order.total_harga,
                    metode,
                    kode_pembayaran: kodeInvoice,
                },
            }),
            prisma.order.update({
                where: { order_id: order.order_id },
                data: { status_pembayaran: "Lunas", status_order: "Diproses" },
            }),
        ])
    );
}