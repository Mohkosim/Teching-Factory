import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderRow } from "@/types/interfaces/pesananAdmin";

export async function getPesananByJurusan(jurusan_id: string): Promise<OrderRow[]> {
    const orders = await prisma.order.findMany({
        where: {
            kode_invoice: { not: null },
            orderDetail: {
                some: { produk: { jurusan_id } },
            },
        },
        include: {
            user: true,
            pengiriman: true,
            refundRequest: { include: { bukti: true } }, // ⬅️ tambahan
            orderDetail: {
                include: {
                    produk: {
                        include: {
                            foto: { take: 1, orderBy: { createdAt: "asc" } },
                            jasa: true,
                            barang: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => {
        const items = order.orderDetail.map((detail) => ({
            produk_id: detail.produk_id,
            nama_produk: detail.produk.nama_produk,
            foto: detail.produk.foto[0]?.url ?? null,
            jumlah: detail.jumlah,
            harga_satuan: detail.harga_satuan,
            subtotal: detail.subtotal,
        }));
        const firstProduk = order.orderDetail[0]?.produk;
        const kategori: "Produk" | "Jasa" =
            firstProduk && firstProduk.jasa.length > 0 ? "Jasa" : "Produk";

        return {
            order_id: order.order_id,
            kode_invoice: order.kode_invoice,
            orderDate: order.createdAt,
            kategori,
            items,
            buyerName: order.user.name,
            buyerPhone: order.user.phone ?? "-",
            buyerEmail: order.user.email,
            buyerAddress: order.pengiriman?.alamat ?? "-",
            totalHarga: order.total_harga,
            ongkir: order.pengiriman?.ongkir ?? 0,
            statusPembayaran: order.status_pembayaran,
            statusPengiriman: order.status_order,
            kurir: order.pengiriman?.kurir ?? "-",
            nomorResi: (order.pengiriman as { nomor_resi?: string } | null)?.nomor_resi ?? null,
            estimasi: order.pengiriman?.estimasi_tiba ?? null,
            refund: order.refundRequest // ⬅️ tambahan
                ? {
                    id: order.refundRequest.refund_id,
                    status: order.refundRequest.status,
                    alasan: order.refundRequest.alasan,
                    deskripsi: order.refundRequest.deskripsi,
                    catatanAdmin: order.refundRequest.catatanAdmin,
                    bukti: order.refundRequest.bukti.map((b) => ({
                        id: b.bukti_id,
                        url: b.url,
                        tipe: b.tipe,
                    })),
                }
                : null,
        };
    });
}