export type StatusPembayaranOrder =
    | "Belum_Bayar"
    | "Menunggu_Konfirmasi"
    | "Lunas"
    | "Gagal";

export type StatusOrderPengiriman =
    | "Menunggu"
    | "Diproses"
    | "Dikirim"
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
}