import type { KeranjangItem } from "@/types/interfaces/keranjang";

function notifyCartUpdated(delta: number) {
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: { delta } }));
}

export async function fetchKeranjang(): Promise<KeranjangItem[]> {
    const res = await fetch("/api/keranjang");
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
}

export async function tambahKeKeranjang(produkId: string, jumlah = 1) {
    const res = await fetch("/api/keranjang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produkId, jumlah }),
    });
    if (res.ok) notifyCartUpdated(jumlah);
    return res;
}

export async function ubahJumlahKeranjang(id: string, delta: number) {
    const res = await fetch(`/api/keranjang/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
    });
    if (res.ok) notifyCartUpdated(delta);
    return res;
}

export async function hapusDariKeranjang(id: string, jumlahDihapus: number) {
    const res = await fetch(`/api/keranjang/${id}`, { method: "DELETE" });
    if (res.ok) notifyCartUpdated(-jumlahDihapus);
    return res;
}