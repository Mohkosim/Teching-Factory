import type { ProdukItem, JasaItem } from "@/types/interfaces/pesanan";

function notifyPesananUpdated(delta: number) {
    window.dispatchEvent(new CustomEvent("pesanan-updated", { detail: { delta } }));
}

export async function fetchPesanan(): Promise<{ produk: ProdukItem[]; jasa: JasaItem[] }> {
    const res = await fetch("/api/pesanan");
    if (!res.ok) throw new Error("Gagal memuat pesanan");
    return res.json();
}

export async function tambahPembayaran(
    orderId: string,
    data: { nominal: number }
): Promise<{ snapToken: string }> {
    const res = await fetch("/api/pesanan-jasa/pembayaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...data }),
    });
    if (!res.ok) throw new Error("Gagal menyimpan pembayaran");
    return res.json();
}

export async function simpanRating(
    produkId: string,
    orderDetailId: string,
    rating: number,
    komentar: string,
    fotoBaru: File[],
    keepFotoIds: string[]
): Promise<{ review_id: string; foto: { foto_id: string; url: string }[] }> {
    const formData = new FormData();
    formData.append("produkId", produkId);
    formData.append("orderDetailId", orderDetailId);
    formData.append("rating", String(rating));
    formData.append("komentar", komentar);
    formData.append("keepFotoIds", JSON.stringify(keepFotoIds));
    fotoBaru.forEach((file) => formData.append("foto", file));

    const res = await fetch("/api/review", {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error("Gagal menyimpan rating");
    return res.json();
}

export async function buatPesananJasa(
    produkId: string,
    data: { namaPelanggan: string; tanggal: string; nominalBayar: number }
) {
    const res = await fetch("/api/pesanan-jasa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produkId, ...data }),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message ?? "Gagal membuat pesanan jasa");
    }
    const result = await res.json() as { orderId: string; kodeInvoice: string; snapToken: string };
    notifyPesananUpdated(1);
    return result;
}

export async function batalkanPesananJasa(orderId: string) {
    const res = await fetch(`/api/pesanan-jasa/${orderId}/batal`, {
        method: "PATCH",
    });
    if (!res.ok) throw new Error("Gagal membatalkan pesanan");
    const result = await res.json() as {
        order_id: string;
        status_order: "Dibatalkan";
        status_pembayaran: "Gagal";
    };
    notifyPesananUpdated(-1);
    return result;
}