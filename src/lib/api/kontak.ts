import { KontakPayload, PesanApi } from "@/types/interfaces/kontak";

export async function kirimPesanKontak(payload: KontakPayload) {
  const res = await fetch("/api/kontak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal mengirim pesan");
  return data;
}

export async function getPesanList(opts?: {
  limit?: number;
  excludeDeleted?: boolean;
}) {
  const query = new URLSearchParams();
  if (opts?.limit) query.set("limit", String(opts.limit));
  if (opts?.excludeDeleted) query.set("excludeDeleted", "true");

  const res = await fetch(`/api/kontak?${query.toString()}`, {
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal memuat pesan");
  return data.data as PesanApi[];
}

export async function bulkUpdatePesan(ids: string[], action: "markRead" | "delete") {
  const res = await fetch("/api/kontak/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal memperbarui pesan");
  return data;
}

export async function updatePesanById(
  id: string,
  payload: { isFavorite?: boolean; isRead?: boolean }
) {
  const res = await fetch(`/api/kontak/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal memperbarui pesan");
  return data;
}