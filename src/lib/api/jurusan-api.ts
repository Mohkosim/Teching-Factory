import type { AddJurusanForm } from "@/lib/validations/createAccount";

export async function createJurusanAccount(payload: AddJurusanForm) {
    const res = await fetch("/api/jurusan-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "CreateFailed");
    }
    return res.json();
}

export interface UpdateJurusanPayload {
    nama_jurusan?: string;
    deskripsi?: string;
    kepala_jurusan?: string;
}

export async function updateJurusanAccount(id: string, payload: UpdateJurusanPayload) {
    const res = await fetch(`/api/jurusan-account/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-data", ...payload }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "UpdateFailed");
    }
    return res.json();
}

export async function toggleJurusanStatus(id: string) {
    const res = await fetch(`/api/jurusan-account/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-status" }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "ToggleFailed");
    }
    return res.json();
}

export async function deleteJurusanAccount(id: string) {
    const res = await fetch(`/api/jurusan-account/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "DeleteFailed");
    }
    return res.json();
}