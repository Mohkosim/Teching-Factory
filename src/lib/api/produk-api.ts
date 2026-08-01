import type { ProdukForm } from "@/lib/validations/produk";

export async function createProduk(values: ProdukForm) {
    const res = await fetch("/api/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "CreateFailed");
    }
    return res.json();
}

export async function updateProduk(id: string, values: ProdukForm) {
    const res = await fetch(`/api/produk/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "UpdateFailed");
    }
    return res.json();
}

export async function deleteProduk(id: string) {
    const res = await fetch(`/api/produk/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "DeleteFailed");
    }
    return res.json();
}

export async function uploadProdukImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/produk/upload", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.message === "FileTooLarge") throw new Error("FileTooLarge");
        if (data.message === "FileTipeSalah") throw new Error("FileTipeSalah");
        throw new Error("UploadFailed");
    }

    const data = await res.json();
    return data.urls as string[];
}