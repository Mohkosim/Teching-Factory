import "server-only";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";
import { kembalikanStok } from "@/lib/order/stok";

export type HasilBatal =
    | { ok: true }
    | { ok: false; status: number; message: string };

function httpStatusDari(err: unknown): number | undefined {
    const e = err as { httpStatusCode?: number | string; ApiResponse?: { status_code?: string } };
    const raw = e?.httpStatusCode ?? e?.ApiResponse?.status_code;
    return raw === undefined ? undefined : Number(raw);
}

export async function matikanTransaksiMidtrans(midtransOrderId: string): Promise<HasilBatal> {
    let status: string | undefined;
    try {
        const res = await coreApi.transaction.status(midtransOrderId);
        status = res.transaction_status as string;
    } catch (err) {
        if (httpStatusDari(err) === 404) return { ok: true };
        console.error("Gagal cek status Midtrans sebelum batal:", err);
        return { ok: false, status: 502, message: "Tidak dapat memverifikasi status pembayaran, coba lagi" };
    }

    if (status === "settlement" || status === "capture") {
        return { ok: false, status: 409, message: "Pembayaran sudah diterima, pesanan tidak bisa dibatalkan" };
    }
    if (status === "pending") {
        try {
            await coreApi.transaction.cancel(midtransOrderId);
        } catch (err) {
            console.error("Gagal membatalkan transaksi Midtrans:", err);
            return { ok: false, status: 502, message: "Gagal membatalkan pembayaran di Midtrans, coba lagi" };
        }
    }
    return { ok: true };
}

export async function batalkanCheckout(userId: string, kodeInvoice: string): Promise<HasilBatal> {
    const orders = await prisma.order.findMany({
        where: { kode_invoice: kodeInvoice },
        include: { orderDetail: true, pengiriman: true },
    });

    if (orders.length === 0 || orders.some((o) => o.user_id !== userId)) {
        return { ok: false, status: 404, message: "Pesanan tidak ditemukan" };
    }
    if (orders.some((o) => o.status_pembayaran === "Lunas")) {
        return { ok: false, status: 400, message: "Pesanan sudah dibayar, tidak bisa dibatalkan" };
    }

    const midtrans = await matikanTransaksiMidtrans(kodeInvoice);
    if (!midtrans.ok) return midtrans;

    await prisma.$transaction(async (tx) => {
        let cartOrder = await tx.order.findFirst({
            where: {
                user_id: userId,
                status_order: "Menunggu",
                status_pembayaran: "Belum_Bayar",
                pengiriman: null,
            },
        });

        for (const order of orders) {
            const stokSudahDikembalikan = order.status_pembayaran === "Gagal";

            for (const detail of order.orderDetail) {
                if (!stokSudahDikembalikan) {
                    await kembalikanStok(tx, {
                        produkId: detail.produk_id,
                        jumlah: detail.jumlah,
                        kombinasiId: detail.kombinasi_id,
                    });
                }

                if (!cartOrder) {
                    cartOrder = await tx.order.create({ data: { user_id: userId, total_harga: 0 } });
                }

                const existing = await tx.order_Detail.findFirst({
                    where: {
                        order_id: cartOrder.order_id,
                        produk_id: detail.produk_id,
                        kombinasi_id: detail.kombinasi_id,
                    },
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
                            kombinasi_id: detail.kombinasi_id,
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

    return { ok: true };
}
