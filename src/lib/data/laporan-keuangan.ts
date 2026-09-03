import { prisma } from "@/lib/prisma";

export interface TransaksiRow {
    id: string;
    transaksiId: string | null;
    noInvoice: string;
    tanggal: string;
    pembeliPemasok: string;
    jenisTransaksi: "Pemasukan" | "Pengeluaran";
    kategori: string;
    deskripsi: string;
    qty: number | string;
    hargaSatuan: number;
    total: number;
    metodePembayaran: string;
    statusSettlement: "Settled" | "Pending" | "Refund"; 
    gambarUrl?: string;
    biayaOngkir?: number;
    biayaMidtrans?: number;
    refund?: { status: "Diajukan" | "Diproses" | "Disetujui" | "Ditolak"; alasan: string }; 
    pembeli?: { nama: string; nomor: string; email: string; alamat: string };
    pengiriman?: { kurir: string; nomorResi: string; estimasi: string };
    historyPengeluaran?: {
        user: string;
        tanggal: string;
        waktu: string;
        keterangan: string;
        labelPerubahan: string;
        dari: string;
        ke: string;
    }[];
}

export async function getLaporanKeuanganData(jurusanId: string) {
    const orderDetails = await prisma.order_Detail.findMany({
        where: { produk: { jurusan_id: jurusanId } },
        include: {
            produk: { include: { foto: true, jasa: true } },
            order: {
                include: {
                    user: { include: { alamat: true } },
                    pengiriman: true,
                    refundRequest: true,
                    transaksi: {
                        where: { jenis_transaksi: "Pemasukan" },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const pemasukanRows: TransaksiRow[] = orderDetails.map((od) => {
        const pembayaran = od.order.transaksi[0];
        const alamatUtama =
            od.order.user.alamat.find((a) => a.isUtama) ?? od.order.user.alamat[0];

        const refund = od.order.refundRequest;
        const refundAktif = !!refund && refund.status !== "Ditolak"; 

        const statusSettlement: TransaksiRow["statusSettlement"] = refundAktif
            ? "Refund"
            : od.order.status_pembayaran === "Lunas"
                ? "Settled"
                : "Pending";

        return {
            id: `masuk-${od.order_detail_id}`,
            transaksiId: null,
            noInvoice: od.order.kode_invoice ?? od.order_id,
            tanggal: od.createdAt.toLocaleDateString("id-ID"),
            pembeliPemasok: od.order.user.name,
            jenisTransaksi: "Pemasukan",
            kategori: od.produk.jasa.length > 0 ? "Jasa" : "Produk",
            deskripsi: od.produk.nama_produk,
            qty: od.jumlah,
            hargaSatuan: od.harga_satuan,
            total: od.order.transaksi[0]?.nominal ?? 0,
            metodePembayaran: pembayaran?.metode ?? "-",
            statusSettlement, 
            gambarUrl: od.produk.foto[0]?.url,
            biayaOngkir: od.order.pengiriman?.ongkir ?? 0,
            biayaMidtrans: pembayaran?.biaya_midtrans ?? 0,
            refund: refund
                ? { status: refund.status, alasan: refund.alasan }
                : undefined,
            pembeli: alamatUtama
                ? {
                    nama: od.order.user.name,
                    nomor: alamatUtama.nomor_telepon,
                    email: od.order.user.email,
                    alamat: `${alamatUtama.alamat_lengkap}, ${alamatUtama.kecamatan}, ${alamatUtama.kota}, ${alamatUtama.provinsi}`,
                }
                : undefined,
            pengiriman: od.order.pengiriman
                ? {
                    kurir: od.order.pengiriman.kurir,
                    nomorResi: od.order.pengiriman.nomor_resi ?? "-",
                    estimasi: od.order.pengiriman.estimasi_tiba ?? "-",
                }
                : undefined,
        };
    });

    const pengeluaranTransaksi = await prisma.transaksi.findMany({
        where: { jurusan_id: jurusanId, jenis_transaksi: "Pengeluaran", order_id: null },
        include: { user: true },
        orderBy: { tanggal_transaksi: "desc" },
    });

    const pengeluaranRows: TransaksiRow[] = pengeluaranTransaksi.map((t) => ({
        id: `keluar-${t.transaksi_id}`,
        transaksiId: t.transaksi_id,
        noInvoice: `PNG-${t.transaksi_id.slice(0, 8).toUpperCase()}`,
        tanggal: t.tanggal_transaksi.toLocaleDateString("id-ID"),
        pembeliPemasok: t.nama ?? t.user.name,
        jenisTransaksi: "Pengeluaran",
        kategori: t.kategori ?? "Operasional",
        deskripsi: t.deskripsi ?? "",
        qty: "-",
        hargaSatuan: 0,
        total: t.nominal,
        metodePembayaran: t.metode ?? "-",
        statusSettlement: t.status_settlement === "Selesai" ? "Settled" : "Pending",
        gambarUrl: t.bukti ?? undefined,
        historyPengeluaran: [],
    }));

    const transaksi = [...pemasukanRows, ...pengeluaranRows].sort(
        (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    const totalPemasukan = pemasukanRows
        .filter((r) => r.statusSettlement === "Settled")
        .reduce((s, r) => s + r.total, 0);
    const totalBiayaMidtrans = pemasukanRows 
        .filter((r) => r.statusSettlement === "Settled")
        .reduce((s, r) => s + (r.biayaMidtrans ?? 0), 0);
    const hpp = pengeluaranRows
        .filter((r) => r.kategori === "Bahan Baku")
        .reduce((s, r) => s + r.total, 0);
    const totalPengeluaran = pengeluaranRows.reduce((s, r) => s + r.total, 0);

    return {
        transaksi,
        ringkasan: { totalPemasukan, totalPengeluaran, hpp, totalBiayaMidtrans }, 
    };
}

export async function getSaldoJurusan(jurusanId: string) {
    const [pemasukanAgg, pengeluaranAgg, penarikanAgg, biayaMidtransAgg] = await Promise.all([
        prisma.order_Detail.aggregate({
            _sum: { subtotal: true },
            where: {
                produk: { jurusan_id: jurusanId },
                order: { status_pembayaran: "Lunas" },
            },
        }),
        prisma.transaksi.aggregate({
            _sum: { nominal: true },
            where: { jurusan_id: jurusanId, jenis_transaksi: "Pengeluaran", order_id: null },
        }),
        prisma.penarikanSaldo.aggregate({
            _sum: { nominal: true },
            where: { jurusan_id: jurusanId, status: { in: ["Pending", "Diproses", "Selesai"] } },
        }),
        prisma.transaksi.aggregate({
            _sum: { biaya_midtrans: true },
            where: {
                jenis_transaksi: "Pemasukan",
                order: {
                    status_pembayaran: "Lunas",
                    orderDetail: { some: { produk: { jurusan_id: jurusanId } } },
                },
            },
        }),
    ]);

    const totalPemasukan = pemasukanAgg._sum.subtotal ?? 0;
    const totalPengeluaran = pengeluaranAgg._sum.nominal ?? 0;
    const totalPenarikan = penarikanAgg._sum.nominal ?? 0;
    const totalBiayaMidtrans = biayaMidtransAgg._sum.biaya_midtrans ?? 0;

    return {
        saldoTersedia: Math.max(0, totalPemasukan - totalBiayaMidtrans - totalPenarikan),
        totalPemasukan,
        totalPengeluaran,
        totalPenarikan,
        totalBiayaMidtrans,
    };
}

export async function getPenarikanList(jurusan_id: string) {
    const rows = await prisma.penarikanSaldo.findMany({
        where: { jurusan_id },
        orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
        id: r.penarikan_id,
        status: r.status,
        nominal: r.nominal,
        tanggal: r.createdAt.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }),
        namaBank: r.nama_bank,
        nomorRekening: r.nomor_rekening,
        atasNama: r.atas_nama,
    }));
}