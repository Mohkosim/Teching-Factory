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

    // AdminSMK
    kepala_sekolah?: string;
    deskripsi_smk?: string;
    alamat?: string;
    kota?: string;
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