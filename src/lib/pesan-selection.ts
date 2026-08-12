const KEY = "selected_pesan_id";

export function setSelectedPesanId(id: string) {
  if (typeof window !== "undefined") sessionStorage.setItem(KEY, id);
}

export function getSelectedPesanId(): string | null {
  if (typeof window !== "undefined") return sessionStorage.getItem(KEY);
  return null;
}

export function clearSelectedPesanId() {
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
}