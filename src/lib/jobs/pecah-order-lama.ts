import { prisma } from "@/lib/prisma";

export async function pecahOrderCampuranLama(): Promise<{ dipecah: number }> {
    const kandidat = await prisma.order.findMany({
        where: {
            OR: [{ kode_invoice: { not: null } }, { pengiriman: { isNot: null } }],
            status_order: { in: ["Menunggu", "Diproses", "Dikirim", "Diterima"] },
            AND: [{ OR: [{ refundRequest: { is: null } }, { refundRequest: { status: { in: ["Diajukan", "Diproses"] } } }] }],
            orderDetail: { some: {} },
        },
        select: { order_id: true, orderDetail: { select: { produk: { select: { jurusan_id: true } } } } },
    });

    const campuran = kandidat.filter((o) => new Set(o.orderDetail.map((d) => d.produk.jurusan_id)).size > 1);
    let dipecah = 0;

    for (const { order_id } of campuran) {
        const sukses = await prisma.$transaction(
            async (tx) => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"pecah-order:" + order_id}))`;

                const order = await tx.order.findUnique({
                    where: { order_id },
                    include: {
                        orderDetail: { include: { produk: { select: { jurusan_id: true } } } },
                        pengiriman: true,
                        transaksi: { where: { jenis_transaksi: "Pemasukan" } },
                    },
                });
                if (!order) return false;

                const grup = new Map<string, typeof order.orderDetail>();
                for (const d of order.orderDetail) {
                    const list = grup.get(d.produk.jurusan_id) ?? [];
                    list.push(d);
                    grup.set(d.produk.jurusan_id, list);
                }
                if (grup.size < 2) return false;

                const daftar = [...grup.entries()]
                    .map(([jurusanId, details]) => ({ jurusanId, details, subtotal: details.reduce((s, d) => s + d.subtotal, 0) }))
                    .sort((a, b) => b.subtotal - a.subtotal);
                const subtotalSemua = daftar.reduce((s, g) => s + g.subtotal, 0);

                const ongkirAsal = order.pengiriman?.ongkir ?? 0;
                const totalAsal = order.total_harga;

                const bagian = (nilai: number, g: { subtotal: number }) =>
                    subtotalSemua > 0 ? Math.round(nilai * (g.subtotal / subtotalSemua)) : 0;

                const lain = daftar.slice(1).map((g) => ({
                    ...g,
                    ongkir: bagian(ongkirAsal, g),
                    total: g.subtotal + bagian(ongkirAsal, g),
                }));
                const ongkirUtama = ongkirAsal - lain.reduce((s, g) => s + g.ongkir, 0);
                const totalUtama = totalAsal - lain.reduce((s, g) => s + g.total, 0);

                const orderBaruIds: { id: string; total: number }[] = [];
                for (const g of lain) {
                    const baru = await tx.order.create({
                        data: {
                            user_id: order.user_id,
                            kode_invoice: order.kode_invoice,
                            seller_jurusan_id: g.jurusanId,
                            total_harga: g.total,
                            tanggal_pengerjaan: order.tanggal_pengerjaan,
                            status_order: order.status_order,
                            status_pembayaran: order.status_pembayaran,
                            createdAt: order.createdAt,
                        },
                    });
                    orderBaruIds.push({ id: baru.order_id, total: g.total });

                    await tx.order_Detail.updateMany({
                        where: { order_detail_id: { in: g.details.map((d) => d.order_detail_id) } },
                        data: { order_id: baru.order_id },
                    });

                    if (order.pengiriman) {
                        const p = order.pengiriman;
                        await tx.pengiriman.create({
                            data: {
                                order_id: baru.order_id,
                                nama_penerima: p.nama_penerima,
                                alamat: p.alamat,
                                kurir: p.kurir,
                                ongkir: g.ongkir,
                                estimasi_tiba: p.estimasi_tiba,
                                diterima_at: p.diterima_at,
                                auto_confirmed: p.auto_confirmed,
                            },
                        });
                    }

                    for (const t of order.transaksi) {
                        const nominal = totalAsal > 0 ? Math.round(t.nominal * (g.total / totalAsal)) : 0;
                        const biaya = totalAsal > 0 ? Math.round((t.biaya_midtrans ?? 0) * (g.total / totalAsal)) : 0;
                        await tx.transaksi.create({
                            data: {
                                order_id: baru.order_id,
                                user_id: t.user_id,
                                jurusan_id: t.jurusan_id,
                                tanggal_transaksi: t.tanggal_transaksi,
                                jenis_transaksi: t.jenis_transaksi,
                                kategori: t.kategori,
                                nama: t.nama,
                                deskripsi: t.deskripsi,
                                nominal,
                                bukti: t.bukti,
                                metode: t.metode,
                                kode_pembayaran: t.kode_pembayaran,
                                midtrans_order_id: t.midtrans_order_id,
                                biaya_midtrans: biaya,
                                status_settlement: t.status_settlement,
                                createdAt: t.createdAt,
                            },
                        });
                    }
                }

                await tx.order.update({
                    where: { order_id },
                    data: { total_harga: totalUtama, seller_jurusan_id: daftar[0].jurusanId },
                });
                if (order.pengiriman) {
                    await tx.pengiriman.update({ where: { order_id }, data: { ongkir: ongkirUtama } });
                }
                for (const t of order.transaksi) {
                    const nominalLain = orderBaruIds.reduce(
                        (s, o) => s + (totalAsal > 0 ? Math.round(t.nominal * (o.total / totalAsal)) : 0),
                        0
                    );
                    const biayaLain = orderBaruIds.reduce(
                        (s, o) => s + (totalAsal > 0 ? Math.round((t.biaya_midtrans ?? 0) * (o.total / totalAsal)) : 0),
                        0
                    );
                    await tx.transaksi.update({
                        where: { transaksi_id: t.transaksi_id },
                        data: { nominal: t.nominal - nominalLain, biaya_midtrans: (t.biaya_midtrans ?? 0) - biayaLain },
                    });
                }
                return true;
            },
            { maxWait: 15_000, timeout: 60_000 }
        );
        if (sukses) dipecah++;
    }

    return { dipecah };
}
