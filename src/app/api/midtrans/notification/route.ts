import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";
import type { MetodePembayaran } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { decodeCicilanOrderId } from "@/lib/utils/invoice";
import { hitungBiayaMidtrans } from "@/lib/midtrans/hitungBiaya";
import { kurangiStokAtomic, kembalikanStok } from "@/lib/order/stok";

interface MidtransNotification {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    transaction_status: string;
    fraud_status?: string;
    payment_type: string;
}

type Tx = Prisma.TransactionClient;

function verifikasiSignature(body: MidtransNotification): boolean {
    const expected = crypto
        .createHash("sha512")
        .update(body.order_id + body.status_code + body.gross_amount + process.env.MIDTRANS_SERVER_KEY)
        .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(String(body.signature_key));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function mapPaymentTypeKeEnum(paymentType: string): MetodePembayaran {
    if (paymentType === "qris") return "QRIS";
    if (paymentType.includes("gopay") || paymentType.includes("shopeepay")) return "E_Wallet";
    return "Transfer";
}

const SUKSES = ["capture", "settlement"];
const GAGAL = ["deny", "cancel", "expire", "failure"];

async function catatPembayaranYatim(midtransOrderId: string, nominal: number) {
    console.error("[WEBHOOK_ORPHAN_PAYMENT] perlu dikembalikan manual", { midtransOrderId, nominal });
    try {
        await prisma.auditLog.create({
            data: {
                actorId: "system",
                actorName: "Webhook Midtrans",
                action: "PEMBAYARAN_TANPA_ORDER",
                targetUserId: "system",
                targetName: midtransOrderId,
                detail: { midtransOrderId, nominal, tindakan: "Kembalikan dana ke pelanggan secara manual" },
            },
        });
    } catch (err) {
        console.error("Gagal mencatat AuditLog pembayaran yatim:", err);
    }
}

function isUniqueViolation(err: unknown) {
    return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function alokasiBiaya(totalBiaya: number, totalHargaPerOrder: number[]): number[] {
    const jumlah = totalHargaPerOrder.reduce((s, v) => s + v, 0);
    let sisa = totalBiaya;
    return totalHargaPerOrder.map((h, i) => {
        if (i === totalHargaPerOrder.length - 1) return sisa;
        const bagian = jumlah > 0 ? Math.round(totalBiaya * (h / jumlah)) : 0;
        sisa -= bagian;
        return bagian;
    });
}

export async function POST(req: Request) {
    let body: MidtransNotification;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ message: "Body tidak valid" }, { status: 400 });
    }

    if (!body?.order_id || !body?.signature_key || !body?.status_code || body?.gross_amount === undefined) {
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
        return NextResponse.json({ message: "OK" });
    }

    const midtransOrderId = body.order_id;
    const nominal = Math.round(Number(statusResponse.gross_amount));
    const paymentType = (statusResponse.payment_type as string) ?? body.payment_type;
    const metodeEnum = mapPaymentTypeKeEnum(paymentType);

    try {
        if (midtransOrderId.startsWith("CICIL-")) {
            await prosesCicilan(midtransOrderId, nominal, metodeEnum, berhasil, paymentType);
        } else if (midtransOrderId.startsWith("JASA-")) {
            await prosesJasaBooking(midtransOrderId, nominal, metodeEnum, berhasil, paymentType);
        } else {
            await prosesCheckoutProduk(midtransOrderId, nominal, metodeEnum, berhasil, paymentType);
        }
    } catch (err) {
        console.error("Webhook error:", err);
        return NextResponse.json({ message: "Gagal memproses notifikasi" }, { status: 500 });
    }

    return NextResponse.json({ message: "OK" });
}

async function totalMasuk(tx: Tx, orderId: string) {
    const agg = await tx.transaksi.aggregate({
        where: { order_id: orderId, jenis_transaksi: "Pemasukan", status_settlement: "Selesai" },
        _sum: { nominal: true },
    });
    return agg._sum.nominal ?? 0;
}

// ==== Cicilan/pelunasan jasa: order_id format CICIL-<orderId>-<timestamp> ====
async function prosesCicilan(
    midtransOrderId: string,
    nominal: number,
    metode: MetodePembayaran,
    berhasil: boolean,
    paymentType: string
) {
    if (!berhasil) return;

    const orderId = decodeCicilanOrderId(midtransOrderId);
    const order = await prisma.order.findUnique({ where: { order_id: orderId } });
    if (!order) {
        await catatPembayaranYatim(midtransOrderId, nominal);
        return;
    }

    let pesananDibatalkan = false;
    try {
        await prisma.$transaction(async (tx) => {
            const sudah = await tx.transaksi.findFirst({
                where: { order_id: order.order_id, midtrans_order_id: midtransOrderId },
                select: { transaksi_id: true },
            });
            if (sudah) return;

            const terbaru = await tx.order.findUnique({
                where: { order_id: order.order_id },
                select: { status_order: true },
            });
            if (!terbaru || terbaru.status_order === "Dibatalkan") {
                pesananDibatalkan = true;
                return;
            }

            const sudahMasuk = await totalMasuk(tx, order.order_id);
            if (nominal > order.total_harga - sudahMasuk) {
                console.error("[WEBHOOK_AMOUNT_MISMATCH] cicilan melebihi sisa tagihan", {
                    midtransOrderId, nominal, total: order.total_harga, sudahMasuk,
                });
                return;
            }

            await tx.transaksi.create({
                data: {
                    order_id: order.order_id,
                    user_id: order.user_id,
                    jenis_transaksi: "Pemasukan",
                    nominal,
                    metode,
                    kode_pembayaran: order.kode_invoice ?? midtransOrderId,
                    midtrans_order_id: midtransOrderId,
                    biaya_midtrans: hitungBiayaMidtrans(paymentType, nominal),
                },
            });

            const lunas = sudahMasuk + nominal >= order.total_harga;
            await tx.order.update({
                where: { order_id: order.order_id },
                data: { status_pembayaran: lunas ? "Lunas" : "Menunggu_Konfirmasi" },
            });
        });
    } catch (err) {
        if (isUniqueViolation(err)) return;
        throw err;
    }

    if (pesananDibatalkan) await catatPembayaranYatim(midtransOrderId, nominal);
}

async function prosesJasaBooking(
    midtransOrderId: string,
    nominal: number,
    metode: MetodePembayaran,
    berhasil: boolean,
    paymentType: string
) {
    const orderId = midtransOrderId.replace("JASA-", "");
    const order = await prisma.order.findUnique({ where: { order_id: orderId } });
    if (!order) {
        if (berhasil) await catatPembayaranYatim(midtransOrderId, nominal);
        return;
    }

    if (!berhasil) {
        await prisma.order.updateMany({
            where: { order_id: orderId, status_pembayaran: { not: "Lunas" }, transaksi: { none: { jenis_transaksi: "Pemasukan" } } },
            data: { status_pembayaran: "Gagal" },
        });
        return;
    }

    let pesananDibatalkan = false;
    try {
        await prisma.$transaction(async (tx) => {
            const sudah = await tx.transaksi.findFirst({
                where: { order_id: orderId, midtrans_order_id: midtransOrderId },
                select: { transaksi_id: true },
            });
            if (sudah) return;

            const terbaru = await tx.order.findUnique({
                where: { order_id: orderId },
                select: { status_order: true },
            });
            if (!terbaru || terbaru.status_order === "Dibatalkan") {
                pesananDibatalkan = true;
                return;
            }

            const sudahMasuk = await totalMasuk(tx, orderId);
            if (nominal > order.total_harga - sudahMasuk) {
                console.error("[WEBHOOK_AMOUNT_MISMATCH] DP jasa melebihi total", {
                    midtransOrderId, nominal, total: order.total_harga, sudahMasuk,
                });
                return;
            }

            await tx.transaksi.create({
                data: {
                    order_id: orderId,
                    user_id: order.user_id,
                    jenis_transaksi: "Pemasukan",
                    nominal,
                    metode,
                    kode_pembayaran: order.kode_invoice ?? midtransOrderId,
                    midtrans_order_id: midtransOrderId,
                    biaya_midtrans: hitungBiayaMidtrans(paymentType, nominal),
                },
            });

            const lunas = sudahMasuk + nominal >= order.total_harga;
            await tx.order.update({
                where: { order_id: orderId },
                data: {
                    status_pembayaran: lunas ? "Lunas" : "Menunggu_Konfirmasi",
                    status_order: lunas ? "Diproses" : order.status_order,
                },
            });
        });
    } catch (err) {
        if (isUniqueViolation(err)) return;
        throw err;
    }

    if (pesananDibatalkan) await catatPembayaranYatim(midtransOrderId, nominal);
}

async function prosesCheckoutProduk(
    kodeInvoice: string,
    nominal: number,
    metode: MetodePembayaran,
    berhasil: boolean,
    paymentType: string
) {
    const orders = await prisma.order.findMany({
        where: { kode_invoice: kodeInvoice },
        include: { orderDetail: true },
        orderBy: { createdAt: "asc" },
    });

    if (orders.length === 0) {
        if (berhasil) {
            await catatPembayaranYatim(kodeInvoice, nominal);
        }
        return;
    }

    if (!berhasil) {
        await prisma.$transaction(async (tx) => {
            for (const order of orders) {
                const klaim = await tx.order.updateMany({
                    where: { order_id: order.order_id, status_pembayaran: { notIn: ["Lunas", "Gagal"] } },
                    data: { status_pembayaran: "Gagal", status_order: "Dibatalkan" },
                });
                if (klaim.count !== 1) continue;
                for (const d of order.orderDetail) {
                    await kembalikanStok(tx, { produkId: d.produk_id, jumlah: d.jumlah, kombinasiId: d.kombinasi_id });
                }
            }
        });
        return;
    }


    const totalTagihan = orders.reduce((s, o) => s + o.total_harga, 0);
    if (nominal !== totalTagihan) {
        console.error("[WEBHOOK_AMOUNT_MISMATCH] checkout produk", { kodeInvoice, nominal, totalTagihan });
        return;
    }

    const biayaPerOrder = alokasiBiaya(hitungBiayaMidtrans(paymentType, nominal), orders.map((o) => o.total_harga));

    try {
        await prisma.$transaction(async (tx) => {
            for (const [i, order] of orders.entries()) {
                const sudah = await tx.transaksi.findFirst({
                    where: { order_id: order.order_id, midtrans_order_id: kodeInvoice },
                    select: { transaksi_id: true },
                });
                if (sudah) continue;

                if (order.status_pembayaran === "Gagal") {
                    for (const d of order.orderDetail) {
                        await kurangiStokAtomic(tx, { produkId: d.produk_id, jumlah: d.jumlah, kombinasiId: d.kombinasi_id });
                    }
                }

                await tx.transaksi.create({
                    data: {
                        order_id: order.order_id,
                        user_id: order.user_id,
                        jenis_transaksi: "Pemasukan",
                        nominal: order.total_harga,
                        metode,
                        kode_pembayaran: kodeInvoice,
                        midtrans_order_id: kodeInvoice,
                        biaya_midtrans: biayaPerOrder[i],
                    },
                });

                await tx.order.update({
                    where: { order_id: order.order_id },
                    data: { status_pembayaran: "Lunas", status_order: "Diproses" },
                });


                for (const d of order.orderDetail) {
                    await tx.produk.update({
                        where: { produk_id: d.produk_id },
                        data: { sold_count: { increment: d.jumlah } },
                    });
                }
            }
        });
    } catch (err) {
        if (isUniqueViolation(err)) return;
        throw err;
    }
}
