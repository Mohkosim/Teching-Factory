export interface ProdukCheckoutItem {
    produkId: string;
    jumlah: number;
    hargaSatuan: number;
    keranjangDetailId?: string;
}

export interface CheckoutPayload {
    alamatId: string;
    toko: {
        jurusanId: string;
        produk: ProdukCheckoutItem[];
        jasa: {
            kurir: string;
            layanan: string;
            ongkir: number;
            estimasi: string;
        };
    }[];
}

export interface CheckoutResult {
    kodeInvoice: string;
    orderIds: string[];
    snapToken: string;
}