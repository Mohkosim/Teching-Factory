export type StatusPembayaranOrder =
    | "Belum_Bayar"
    | "Menunggu_Konfirmasi"
    | "Lunas"
    | "Gagal";

export type StatusOrderPengiriman =
    | "Menunggu"
    | "Diproses"
    | "Dikirim"
    | "Diterima"
    | "Selesai"
    | "Dibatalkan";

export interface OrderItemLine {
    produk_id: string;
    nama_produk: string;
    foto: string | null;
    jumlah: number;
    harga_satuan: number;
    subtotal: number;
}

export interface OrderRow {
    order_id: string;
    kode_invoice: string | null;
    orderDate: Date;
    kategori: "Produk" | "Jasa";
    items: OrderItemLine[];
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    buyerAddress: string;
    totalHarga: number;
    ongkir: number;
    statusPembayaran: StatusPembayaranOrder;
    statusPengiriman: StatusOrderPengiriman;
    kurir: string;
    nomorResi: string | null;
    estimasi: string | null;
    refund: RefundInfoAdmin | null;
    statusResi?: string | null;
    cekTerakhirAt?: Date | null;
    autoConfirmed?: boolean;
}

export type StatusRefund = "Diajukan" | "Diproses" | "Disetujui" | "Ditolak";
export type TipeBuktiRefund = "Foto" | "Video";

export interface RefundBuktiAdmin {
    id: string;
    url: string;
    tipe: TipeBuktiRefund;
}

export interface RefundInfoAdmin {
    id: string;
    status: StatusRefund;
    alasan: string;
    deskripsi: string;
    catatanAdmin: string | null;
    bukti: RefundBuktiAdmin[];
}