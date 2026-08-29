import type { AlamatData, AlamatPayload } from "@/types/interfaces/alamat";

export async function uploadAvatar(base64: string): Promise<string> {
    const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message === "FileTooLarge" ? "FileTooLarge" : "UploadFailed");
    }

    const data = await res.json();
    return data.url as string;
}

export interface UpdateProfilePayload {
    name: string;
    email: string;
    img?: string;
    gender?: "Laki_laki" | "Perempuan";

    // AdminSMK
    kepala_sekolah?: string;
    deskripsi_smk?: string;
    alamat?: string;
    kecamatan?: string;      // <-- BARU
    kota?: string;
    kota_id?: number | null; // <-- BARU
    kode_pos?: string;       // <-- BARU
    provinsi?: string;
    map_link?: string;
    tahun_berdiri?: number;

    // AdminJurusan
    phone?: string;
    deskripsi?: string;
    kepala_jurusan?: string;
    jam_operasional?: string;
}

export async function updateProfile(payload: UpdateProfilePayload) {
    const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "UpdateFailed");
    }

    return res.json();
}

export async function updatePassword(passwordLama: string, passwordBaru: string) {
    const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordLama, passwordBaru }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "UpdateFailed");
    }

    return res.json();
}

export async function getAlamatList(): Promise<AlamatData[]> {
    const res = await fetch("/api/profile/alamat");
    if (!res.ok) throw new Error("Gagal memuat alamat");
    return res.json();
}

export async function createAlamat(payload: AlamatPayload): Promise<AlamatData> {
    const res = await fetch("/api/profile/alamat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Gagal menambah alamat");
    }
    return res.json();
}

export async function updateAlamat(id: string, payload: Partial<AlamatPayload>): Promise<AlamatData> {
    const res = await fetch(`/api/profile/alamat/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Gagal memperbarui alamat");
    }
    return res.json();
}

export async function deleteAlamat(id: string): Promise<void> {
    const res = await fetch(`/api/profile/alamat/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Gagal menghapus alamat");
    }
}