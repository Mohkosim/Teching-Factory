import { prisma } from "@/lib/prisma";
import type { StatusOrder, StatusPembayaran } from "@/generated/prisma/enums";
import type { ProdukItem, JasaItem } from "@/types/interfaces/pesanan";

function mapStatusKeStep(statusPembayaran: StatusPembayaran, statusOrder: StatusOrder): 0 | 1 | 2 | 3 {
    if (statusPembayaran !== "Lunas") return 0;
    switch (statusOrder) {
        case "Dikirim": return 2;
        case "Selesai": return 3;
        default: return 1;
    }
}

export async function getPesananData(userId: string): Promise<{ produk: ProdukItem[]; jasa: JasaItem[] }> {
    const orders = await prisma.order.findMany({
        where: {
            user_id: userId,
            kode_invoice: { not: null },
        },
        include: {
            user: {
                include: {
                    alamat: { orderBy: { isUtama: "desc" } },
                },
            },
            orderDetail: {
                include: {
                    review: { include: { foto: true } },
                    produk: {
                        include: {
                            foto: true,
                            barang: true,
                            jasa: true,
                            jurusan: {
                                include: {
                                    user: true,
                                    smk: { include: { user: true } },
                                },
                            },
                        },
                    },
                },
            },
            transaksi: true,
            pengiriman: true,
        },
        orderBy: { createdAt: "desc" },
    });

    const produk: ProdukItem[] = [];
    const jasa: JasaItem[] = [];

    for (const order of orders) {
        const kodeInvoice = order.kode_invoice ?? order.order_id;
        const timelineStep = mapStatusKeStep(order.status_pembayaran, order.status_order);

        const alamatUtama = order.user.alamat[0];
        const alamatPembeliLengkap = alamatUtama
            ? `${alamatUtama.alamat_lengkap}, ${alamatUtama.kecamatan}, ${alamatUtama.kota}, ${alamatUtama.provinsi} ${alamatUtama.kode_pos}`
            : "-";

        for (const detail of order.orderDetail) {
            const p = detail.produk;
            const thumbnail = p.foto[0]?.url ?? "";
            const review = detail.review;
            const fotoUlasan = review?.foto.map((f) => ({ id: f.foto_id, url: f.url })) ?? [];

            if (p.barang.length > 0) {
                produk.push({
                    id: detail.order_detail_id,
                    orderId: order.order_id,
                    kodeInvoice,
                    produkId: p.produk_id,
                    nama: p.nama_produk,
                    harga: `Rp ${detail.harga_satuan.toLocaleString("id-ID")}`,
                    hargaAngka: detail.harga_satuan,
                    thumbnail,
                    jumlah: detail.jumlah,
                    statusBayar: order.status_pembayaran === "Lunas" ? "Dibayar" : "Belum Dibayar",
                    statusKirim:
                        order.status_order === "Selesai" ? "Telah Dikirim" :
                            order.status_order === "Dikirim" ? "Sedang Dikirim" : "Diproses",
                    tanggal: order.createdAt.toISOString(),
                    timelineStep,
                    biayaOngkir: order.pengiriman?.ongkir ?? 0,
                    rating: review?.rating,
                    ulasan: review?.komentar ?? undefined,
                    fotoUlasan,
                    pembeli: {
                        nama: order.user.name,
                        nomor: order.user.phone ?? "-",
                        email: order.user.email,
                        alamat: order.pengiriman?.alamat ?? "-",
                    },
                    pengiriman: {
                        kurir: order.pengiriman?.kurir ?? "-",
                        nomorResi: order.pengiriman?.nomor_resi ?? "-",
                        estimasi: order.pengiriman?.estimasi_tiba ?? "-",
                    },
                });
            }

            if (p.jasa.length > 0) {
                const totalDibayar = order.transaksi
                    .filter((t) => t.jenis_transaksi === "Pemasukan")
                    .reduce((sum, t) => sum + t.nominal, 0);
                const total = detail.subtotal;
                const progress = total > 0 ? Math.min(100, Math.round((totalDibayar / total) * 100)) : 0;
                const lunas = order.status_pembayaran === "Lunas";

                const lokasiPengerjaan = p.jurusan.smk?.user.name ?? "-";

                jasa.push({
                    id: detail.order_detail_id,
                    orderId: order.order_id,
                    produkId: p.produk_id,
                    nama: p.nama_produk,
                    total,
                    thumbnail,
                    dp: totalDibayar,
                    progress,
                    status: lunas ? "lunas" : "berjalan",
                    keterangan: lunas
                        ? "Lunas - pesanan diselesaikan"
                        : `DP Rp ${totalDibayar.toLocaleString("id-ID")} dari Rp ${total.toLocaleString("id-ID")}`,
                    tanggal: order.createdAt.toISOString(),
                    jumlah: detail.jumlah,
                    timelineStep,
                    noWhatsapp: p.jurusan.user.phone ?? undefined,
                    pembeli: {
                        nama: order.user.name,
                        nomor: order.user.phone ?? "-",
                        email: order.user.email,
                        alamat: alamatPembeliLengkap,
                    },
                    jadwal: {
                        lokasi: lokasiPengerjaan,
                        estimasi: p.jasa[0]?.estimasi_pengerjaan ?? "-",
                    },
                    rating: review?.rating,
                    ulasan: review?.komentar ?? undefined,
                    fotoUlasan,
                    riwayatPembayaran: order.transaksi
                        .filter((t) => t.jenis_transaksi === "Pemasukan")
                        .map((t) => ({
                            id: t.transaksi_id,
                            nominal: t.nominal,
                            metode: t.metode,
                            tanggal: t.tanggal_transaksi.toISOString(),
                            buktiNama: t.bukti ?? undefined,
                        })),
                });
            }
        }
    }

    return { produk, jasa };
}