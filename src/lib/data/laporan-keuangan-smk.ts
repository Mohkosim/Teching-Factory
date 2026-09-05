import { prisma } from "@/lib/prisma";

export type JenisTransaksiUI = "Pemasukan" | "Pengeluaran";
export type StatusSettlementUI = "Settled" | "Pending" | "Refund";

export interface TransaksiItem {
    id: string;
    noInvoice: string;
    tanggal: string;
    kodeTransaksi: string;
    pembeliPemasok: string;
    jurusan: string;
    jenisTransaksi: JenisTransaksiUI;
    kategori: string;
    deskripsi: string;
    qty: number | string;
    hargaSatuan: number;
    total: number;
    metodePembayaran: string;
    statusSettlement: StatusSettlementUI;
}

function formatTanggal(date: Date): string {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function mapStatusSettlement(status: string, isRefunded: boolean): StatusSettlementUI {
    if (isRefunded) return "Refund";
    return status === "Selesai" ? "Settled" : "Pending";
}

function mapMetode(metode: string | null): string {
    if (!metode) return "-";
    return metode === "E_Wallet" ? "E-Wallet" : metode;
}

export async function getSmkIdByUser(userId: string) {
    const smk = await prisma.sMK.findUnique({
        where: { user_id: userId },
        select: { smk_id: true },
    });
    return smk?.smk_id ?? null;
}

// Semua transaksi (Pemasukan & Pengeluaran) milik seluruh jurusan dalam 1 SMK
export async function getTransaksiSmk(smk_id: string): Promise<TransaksiItem[]> {
    const transaksiList = await prisma.transaksi.findMany({
        where: {
            OR: [
                { jurusan: { smk_id } },
                { order: { orderDetail: { some: { produk: { jurusan: { smk_id } } } } } },
            ],
        },
        include: {
            user: { select: { name: true } },
            jurusan: { select: { nama_jurusan: true } },
            order: {
                select: {
                    kode_invoice: true,
                    refundRequest: { select: { status: true } },
                    orderDetail: {
                        select: {
                            jumlah: true,
                            harga_satuan: true,
                            produk: {
                                select: {
                                    nama_produk: true,
                                    jurusan: { select: { nama_jurusan: true } },
                                    jasa: { select: { jasa_id: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: { tanggal_transaksi: "desc" },
    });

    return transaksiList.map((t) => {
        const items = t.order?.orderDetail ?? [];
        const totalQty = items.reduce((s, i) => s + i.jumlah, 0);
        const isJasa = items.some((i) => i.produk.jasa.length > 0);

        const isRefunded = t.order?.refundRequest?.status === "Disetujui";

        const deskripsiOtomatis = items.length > 0
            ? items.map((i) => i.produk.nama_produk).join(", ")
            : null;

        const jurusanNama =
            t.jurusan?.nama_jurusan ??
            items[0]?.produk.jurusan?.nama_jurusan ??
            "-";

        return {
            id: t.transaksi_id,
            noInvoice: t.order?.kode_invoice ?? t.kode_pembayaran ?? "-",
            tanggal: formatTanggal(t.tanggal_transaksi),
            kodeTransaksi: t.transaksi_id.slice(0, 8).toUpperCase(),
            pembeliPemasok: t.nama ?? t.user.name,
            jurusan: jurusanNama,
            jenisTransaksi: t.jenis_transaksi as JenisTransaksiUI,
            kategori: t.kategori ?? (isJasa ? "Jasa" : "Produk"),
            deskripsi: deskripsiOtomatis ?? t.deskripsi ?? "-",
            qty: items.length > 0 ? totalQty : "-",
            hargaSatuan: items.length === 1 ? items[0].harga_satuan : 0,
            total: t.nominal,
            metodePembayaran: mapMetode(t.metode),
            statusSettlement: mapStatusSettlement(t.status_settlement, isRefunded),
        };
    });
}

// Ringkasan total pemasukan/pengeluaran seluruh SMK
export async function getRingkasanSmk(smk_id: string) {
    const transaksi = await getTransaksiSmk(smk_id);

    const totalPemasukan = transaksi
        .filter((t) => t.jenisTransaksi === "Pemasukan" && t.statusSettlement === "Settled")
        .reduce((s, t) => s + t.total, 0);

    const totalRefund = transaksi
        .filter((t) => t.jenisTransaksi === "Pemasukan" && t.statusSettlement === "Refund")
        .reduce((s, t) => s + t.total, 0);

    const totalPengeluaran = transaksi
        .filter((t) => t.jenisTransaksi === "Pengeluaran")
        .reduce((s, t) => s + t.total, 0);

    const totalHpp = transaksi
        .filter((t) => t.jenisTransaksi === "Pengeluaran" && t.kategori === "Bahan Baku")
        .reduce((s, t) => s + t.total, 0);

    const biayaMidtransAgg = await prisma.transaksi.aggregate({
        _sum: { biaya_midtrans: true },
        where: {
            jenis_transaksi: "Pemasukan",
            status_settlement: "Selesai",
            OR: [
                { jurusan: { smk_id } },
                { order: { orderDetail: { some: { produk: { jurusan: { smk_id } } } } } },
            ],
            AND: [
                {
                    OR: [
                        { order: null },
                        { order: { refundRequest: null } },
                        { order: { refundRequest: { status: "Ditolak" } } },
                    ],
                },
            ],
        },
    });
    const totalBiayaMidtrans = biayaMidtransAgg._sum.biaya_midtrans ?? 0;

    const labaKotor = totalPemasukan - totalHpp;
    const totalPengeluaranOps = totalPengeluaran - totalHpp;
    const labaBersih = labaKotor - totalPengeluaranOps - totalBiayaMidtrans;

    return {
        totalPemasukan,
        totalPengeluaran,
        totalHpp,
        labaKotor,
        totalBiayaMidtrans,
        totalRefund,
        labaBersih,
    };
}

// Breakdown pengeluaran: Bahan Baku vs Operasional vs Lainnya (Gaji Karyawan + kategori lain)
export async function getPengeluaranBreakdownSmk(smk_id: string) {
    const pengeluaranList = await prisma.transaksi.findMany({
        where: {
            jenis_transaksi: "Pengeluaran",
            jurusan: { smk_id },
        },
        select: { kategori: true, nominal: true },
    });

    const total = pengeluaranList.reduce((s, t) => s + t.nominal, 0);

    const bahanBaku = pengeluaranList
        .filter((t) => t.kategori === "Bahan Baku")
        .reduce((s, t) => s + t.nominal, 0);

    const operasional = pengeluaranList
        .filter((t) => t.kategori === "Operasional")
        .reduce((s, t) => s + t.nominal, 0);

    const persenBahanBaku = total > 0 ? Math.round((bahanBaku / total) * 100) : 0;
    const persenOperasional = total > 0 ? Math.round((operasional / total) * 100) : 0;
    const persenLainnya = total > 0 ? 100 - persenBahanBaku - persenOperasional : 0; 

    const kategoriTerbesar = total > 0
        ? [
            { name: "Bahan Baku", persen: persenBahanBaku },
            { name: "Operasional", persen: persenOperasional },
            { name: "Lainnya", persen: persenLainnya },
        ].sort((a, b) => b.persen - a.persen)[0]
        : { name: "Belum ada data", persen: 0 }; 

    return {
        total,
        persen: kategoriTerbesar.persen,
        persenLabel: kategoriTerbesar.name,
        data: total > 0
            ? [
                { name: "Pengeluaran Bahan Baku", value: persenBahanBaku, color: "#f87171" },
                { name: "Pengeluaran Operasional", value: persenOperasional, color: "#fbbf24" },
                { name: "Pengeluaran Lainnya", value: persenLainnya, color: "#a78bfa" },
            ]
            : [{ name: "Belum ada data", value: 1, color: "#e5e7eb" }],
    };
}

// Breakdown pemasukan: Produk vs Jasa
export async function getPemasukanBreakdownSmk(smk_id: string) {
    const orderDetails = await prisma.order_Detail.findMany({
        where: {
            order: {
                transaksi: { some: { jenis_transaksi: "Pemasukan" } },
            },
            produk: { jurusan: { smk_id } },
        },
        select: {
            subtotal: true,
            produk: { select: { jasa: { select: { jasa_id: true } } } },
        },
    });

    let totalProduk = 0;
    let totalJasa = 0;
    for (const od of orderDetails) {
        if (od.produk.jasa.length > 0) totalJasa += od.subtotal;
        else totalProduk += od.subtotal;
    }

    const total = totalProduk + totalJasa;
    const persenProduk = total > 0 ? Math.round((totalProduk / total) * 100) : 0;
    const persenJasa = total > 0 ? 100 - persenProduk : 0; 

    const kategoriTerbesar = total > 0
        ? [
            { name: "Produk", persen: persenProduk },
            { name: "Jasa", persen: persenJasa },
        ].sort((a, b) => b.persen - a.persen)[0]
        : { name: "Belum ada data", persen: 0 };

    return {
        total,
        persen: kategoriTerbesar.persen,
        persenLabel: kategoriTerbesar.name,
        data: total > 0
            ? [
                { name: "Pemasukan Produk", value: persenProduk, color: "#38bdf8" },
                { name: "Pemasukan Jasa", value: persenJasa, color: "#a78bfa" },
            ]
            : [{ name: "Belum ada data", value: 1, color: "#e5e7eb" }],
    };
}