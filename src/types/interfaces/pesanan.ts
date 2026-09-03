export interface RiwayatPembayaran {
    id: string;
    nominal: number;
    metode: string;
    tanggal: string;
    buktiNama?: string;
}

export interface FotoUlasan {
    id: string;
    url: string;
}

export interface ProdukItem {
    id: string;
    orderId: string;
    kodeInvoice: string;
    produkId: string;
    nama: string;
    harga: string;
    hargaAngka: number;
    thumbnail: string;
    jumlah: number;
    statusBayar: "Dibayar" | "Belum Dibayar";
    statusKirim: "Diterima" | "Selesai" | "Sedang Dikirim" | "Diproses";
    tanggal: string;
    timelineStep: 0 | 1 | 2 | 3;
    biayaOngkir: number;
    rating?: number;
    ulasan?: string;
    fotoUlasan?: FotoUlasan[];
    refund: RefundInfo | null;
    namaSmk: string;
    namaJurusan: string;
    pembeli: {
        nama: string;
        nomor: string;
        email: string;
        alamat: string;
    };
    pengiriman: {
        kurir: string;
        nomorResi: string;
        estimasi: string;
        statusResi?: string;
        cekTerakhirAt?: string;
        autoConfirmed?: boolean;
    }
}

export interface JasaItem {
    id: string;
    orderId: string;
    kodeInvoice: string;
    produkId: string;
    nama: string;
    total: number;
    thumbnail: string;
    dp?: number;
    progress: number;
    status: "berjalan" | "lunas";
    keterangan: string;
    tanggal: string;
    jumlah: number;
    timelineStep: 0 | 1 | 2 | 3;
    noWhatsapp?: string;
    namaSmk: string;
    namaJurusan: string;
    pembeli: {
        nama: string;
        nomor: string;
        email: string;
        alamat: string;
    };
    jadwal: {
        lokasi: string;
        estimasi: string;
    };
    rating?: number;
    ulasan?: string;
    fotoUlasan?: FotoUlasan[];
    riwayatPembayaran: RiwayatPembayaran[];
}

export type StatusRefund = "Diajukan" | "Diproses" | "Disetujui" | "Ditolak";

export interface RefundInfo {
    id: string;
    status: StatusRefund;
    alasan: string;
    deskripsi: string;
    catatanAdmin?: string | null;
    bukti: { id: string; url: string; tipe: "Foto" | "Video" }[];
}