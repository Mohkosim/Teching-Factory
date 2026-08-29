import type { KeranjangItem } from "@/types/interfaces/keranjang";

function notifyCartUpdated() {
    window.dispatchEvent(new Event("cart-updated"));
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
    if (res.ok) notifyCartUpdated();
    return res;
}

export async function ubahJumlahKeranjang(id: string, delta: number) {
    const res = await fetch(`/api/keranjang/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
    });
    if (res.ok) notifyCartUpdated();
    return res;
}

export async function hapusDariKeranjang(id: string) {
    const res = await fetch(`/api/keranjang/${id}`, { method: "DELETE" });
    if (res.ok) notifyCartUpdated();
    return res;
}