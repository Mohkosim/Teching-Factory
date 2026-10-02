export interface DasarPembayaranOrder {
    kategori: "Produk" | "Jasa";
    statusPembayaran: string;
    totalHarga: number;
    totalDibayar: number;
}

export function sisaTagihan(o: Pick<DasarPembayaranOrder, "totalHarga" | "totalDibayar">): number {
    return Math.max(0, o.totalHarga - o.totalDibayar);
}

export function sudahLunas(o: DasarPembayaranOrder): boolean {
    return o.statusPembayaran === "Lunas" || (o.totalHarga > 0 && o.totalDibayar >= o.totalHarga);
}

export function dpSudahMasuk(o: DasarPembayaranOrder): boolean {
    return o.kategori === "Jasa" && o.totalDibayar > 0 && !sudahLunas(o);
}

export function adminBolehMengelola(o: DasarPembayaranOrder): boolean {
    if (sudahLunas(o)) return true;
    return o.kategori === "Jasa" && o.totalDibayar > 0;
}

export function bolehDiselesaikan(o: DasarPembayaranOrder): boolean {
    return sudahLunas(o);
}

export const PESAN_MENUNGGU_PELUNASAN = "Pesanan jasa baru bisa diselesaikan setelah pembayaran lunas.";
export const PESAN_BELUM_ADA_DP = "Pesanan belum bisa diproses karena DP belum dibayar.";
