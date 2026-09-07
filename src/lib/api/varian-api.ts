import type { SimpanVarianInput } from "@/lib/validations/varian";
import type { GetVarianResponse } from "@/types/interfaces/varian";

export async function getVarianProduk(produkId: string): Promise<GetVarianResponse> {
    const res = await fetch(`/api/produk/${produkId}/varian`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "GetVarianFailed");
    }
    return res.json();
}

export async function simpanVarianProduk(produkId: string, values: SimpanVarianInput) {
    const res = await fetch(`/api/produk/${produkId}/varian`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "SimpanVarianFailed");
    }
    return res.json();
}

export async function uploadVarianImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("files", file);

    const res = await fetch("/api/produk/${produkId}/varian/upload", {
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
    return data.urls[0] as string;
}