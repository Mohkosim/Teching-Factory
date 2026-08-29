import type { KurirAktifData } from "@/types/interfaces/kurir";

export async function getKurirAktifList(): Promise<KurirAktifData[]> {
    const res = await fetch("/api/jurusan/kurir");
    if (!res.ok) throw new Error("Gagal memuat data kurir");
    return res.json();
}

export async function tambahKurir(kode_kurir: string, nama_kurir: string) {
    const res = await fetch("/api/jurusan/kurir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode_kurir, nama_kurir }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Gagal menambah kurir");
    }
    return res.json();
}

export async function updateStatusKurir(id: string, status: boolean) {
    const res = await fetch(`/api/jurusan/kurir/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Gagal memperbarui status");
    return res.json();
}

export async function hapusKurir(id: string) {
    const res = await fetch(`/api/jurusan/kurir/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Gagal menghapus kurir");
}