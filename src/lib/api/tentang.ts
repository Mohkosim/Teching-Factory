import { TentangTefaApi } from "@/types/interfaces/tentang";

export async function getTentangTefa() {
  const res = await fetch("/api/tentang", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal memuat data");
  return data.data as TentangTefaApi | null;
}

export async function saveTentangTefa(payload: {
  deskripsi: string;
  videoLink: string;
  files: File[];
}) {
  const formData = new FormData();
  formData.append("deskripsi", payload.deskripsi);
  formData.append("videoLink", payload.videoLink);
  payload.files.forEach((f) => formData.append("files", f));

  const res = await fetch("/api/tentang", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal menyimpan data");
  return data.data as TentangTefaApi;
}

export async function deleteTentangFoto(id: string) {
  const res = await fetch(`/api/tentang/foto/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal menghapus foto");
  return data;
}