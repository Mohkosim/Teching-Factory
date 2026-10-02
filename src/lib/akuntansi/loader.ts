import { prisma } from "@/lib/prisma";
import {
    bangunJurnalOtomatis,
    type BarisJurnal,
    type Jurnal,
    type SumberAkuntansi,
    type SumberManual,
    type SumberOrder,
} from "./engine";

function parseBaris(value: unknown): BarisJurnal[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((b) => ({
            kode: String((b as BarisJurnal).kode ?? ""),
            debit: Number((b as BarisJurnal).debit ?? 0),
            kredit: Number((b as BarisJurnal).kredit ?? 0),
        }))
        .filter((b) => b.kode && (b.debit > 0 || b.kredit > 0));
}

export async function ambilSumberAkuntansi(jurusanId: string): Promise<SumberAkuntansi> {
    const detailJurusan = await prisma.order_Detail.findMany({
        where: { produk: { jurusan_id: jurusanId } },
        select: { order_id: true },
        distinct: ["order_id"],
    });
    const orderIds = detailJurusan.map((d) => d.order_id);

    const [orders, pengeluaran, penarikan, manual] = await Promise.all([
        orderIds.length === 0
            ? Promise.resolve([])
            : prisma.order.findMany({
                  where: {
                      order_id: { in: orderIds },
                      transaksi: { some: { jenis_transaksi: "Pemasukan" } },
                  },
                  include: {
                      orderDetail: { include: { produk: { include: { jasa: true } } } },
                      pengiriman: true,
                      refundRequest: true,
                      transaksi: { where: { jenis_transaksi: "Pemasukan", status_settlement: "Selesai" } },
                  },
              }),
        prisma.transaksi.findMany({
            where: { jurusan_id: jurusanId, jenis_transaksi: "Pengeluaran", order_id: null, status_settlement: "Selesai" },
            select: { transaksi_id: true, tanggal_transaksi: true, nominal: true, kategori: true, nama: true, deskripsi: true },
        }),
        prisma.penarikanSaldo.findMany({
            where: { jurusan_id: jurusanId, status: "Selesai" },
            select: { penarikan_id: true, updatedAt: true, nominal: true },
        }),
        prisma.jurnalManual.findMany({ where: { jurusan_id: jurusanId } }),
    ]);

    const order: SumberOrder[] = orders.map((o) => {
        const milikJurusan = o.orderDetail.filter((d) => d.produk.jurusan_id === jurusanId);
        const jasa = milikJurusan.filter((d) => d.produk.jasa.length > 0).reduce((s, d) => s + d.subtotal, 0);
        const produk = milikJurusan.filter((d) => d.produk.jasa.length === 0).reduce((s, d) => s + d.subtotal, 0);
        const subtotalOrder = o.orderDetail.reduce((s, d) => s + d.subtotal, 0);
        return {
            orderId: o.order_id,
            kode: o.kode_invoice ?? o.order_id.slice(0, 8).toUpperCase(),
            statusOrder: o.status_order,
            statusPembayaran: o.status_pembayaran,
            produk,
            jasa,
            subtotalOrder,
            ongkirOrder: o.pengiriman?.ongkir ?? Math.max(0, o.total_harga - subtotalOrder),
            diterimaAt: o.pengiriman?.diterima_at ?? null,
            updatedAt: o.updatedAt,
            pembayaran: o.transaksi.map((t) => ({
                id: t.transaksi_id,
                tanggal: t.tanggal_transaksi,
                nominal: t.nominal,
                biayaMidtrans: t.biaya_midtrans ?? 0,
            })),
            refund: o.refundRequest ? { status: o.refundRequest.status, tanggal: o.refundRequest.updatedAt } : null,
        };
    });

    return {
        order,
        pengeluaran: pengeluaran.map((t) => ({
            id: t.transaksi_id,
            tanggal: t.tanggal_transaksi,
            nominal: t.nominal,
            kategori: t.kategori,
            nama: t.nama,
            deskripsi: t.deskripsi,
        })),
        penarikan: penarikan.map((t) => ({ id: t.penarikan_id, tanggal: t.updatedAt, nominal: t.nominal })),
        manual: manual.map(
            (m): SumberManual => ({
                id: m.jurnal_id,
                tanggal: m.tanggal,
                createdAt: m.createdAt,
                tipe: m.tipe,
                keterangan: m.keterangan,
                baris: parseBaris(m.baris),
            }),
        ),
    };
}

export async function getAkuntansiJurusan(jurusanId: string): Promise<{ jurnal: Jurnal[]; peringatan: string[] }> {
    return bangunJurnalOtomatis(await ambilSumberAkuntansi(jurusanId));
}
