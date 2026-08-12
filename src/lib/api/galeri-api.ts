import type { GaleriForm } from "@/lib/validations/galeri";

export async function createGaleri(values: GaleriForm) {
    const res = await fetch("/api/galeri", {
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

export async function updateGaleri(id: string, values: GaleriForm) {
    const res = await fetch(`/api/galeri/${id}`, {
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

export async function deleteGaleri(id: string) {
    const res = await fetch(`/api/galeri/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "DeleteFailed");
    }
    return res.json();
}

export async function uploadGaleriImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/galeri/upload", {
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
    return data.url as string;
}

export async function fetchGaleriDetail(galeri_id: string): Promise<GaleriForm> {
  const res = await fetch("/api/galeri/detail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ galeri_id }),
  });

  if (!res.ok) {
    throw new Error("Gagal memuat detail galeri");
  }

  return res.json();
}