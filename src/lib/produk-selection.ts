const KEY = "selected_produk_id";

export function setSelectedProdukId(id: string) {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(KEY, id);
}

export function getSelectedProdukId(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(KEY);
}

export function clearSelectedProdukId() {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(KEY);
}