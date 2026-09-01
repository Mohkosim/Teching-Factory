function notifyFavoritUpdated(delta: number) {
    window.dispatchEvent(new CustomEvent("favorite-updated", { detail: { delta } }));
}

export async function toggleFavoritProduk(produkId: string) {
    return toggleFavoritDenganNotifikasi({ produkId });
}

export async function toggleFavoritJasa(jasaId: string) {
    return toggleFavoritDenganNotifikasi({ jasaId });
}

async function toggleFavoritDenganNotifikasi(body: { produkId?: string; jasaId?: string }) {
    const res = await fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (res.ok) {
        try {
            const data = await res.clone().json();
            if (typeof data.favorited === "boolean") {
                notifyFavoritUpdated(data.favorited ? 1 : -1);
            }
        } catch {
        }
    }

    return res;
}