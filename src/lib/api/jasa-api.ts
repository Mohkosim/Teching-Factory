import type { JasaForm } from "@/lib/validations/jasa";

export async function createJasa(values: JasaForm) {
    const res = await fetch("/api/jasa", {
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

export async function updateJasa(id: string, values: JasaForm) {
    const res = await fetch(`/api/jasa/${id}`, {
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

export async function deleteJasa(id: string) {
    const res = await fetch(`/api/jasa/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "DeleteFailed");
    }
    return res.json();
}

export async function uploadJasaImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/jasa/upload", {
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

export async function publikasiJasa(id: string) {
    const res = await fetch(`/api/jasa/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publikasi" }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "PublikasiFailed");
    }
    return res.json();
}

export async function revisiJasa(id: string, catatan_revisi: string) {
    const res = await fetch(`/api/jasa/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revisi", catatan_revisi }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "RevisiFailed");
    }
    return res.json();
}