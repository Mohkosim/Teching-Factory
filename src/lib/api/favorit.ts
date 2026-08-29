export async function toggleFavoritProduk(produkId: string) {
    return fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produkId }),
    });
}

export async function toggleFavoritJasa(jasaId: string) {
    return fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jasaId }),
    });
}