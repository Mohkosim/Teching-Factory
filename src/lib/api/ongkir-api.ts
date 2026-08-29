export interface OngkirRate {
  code: string;
  name: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export async function getOngkosKirim(
  originId: number,
  destinationId: number,
  weight: number,
  jurusanId: string
): Promise<OngkirRate[]> {
  const res = await fetch("/api/ongkir/cost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originId, destinationId, weight, jurusanId }),
  });

  if (!res.ok) throw new Error("Gagal mengambil data ongkos kirim");
  const json = await res.json();

  if (json.error && (!json.data || json.data.length === 0)) {
    throw new Error(json.error);
  }

  return json.data ?? [];
}

export interface OngkirDestination {
  id: number;
  label: string;
  provinsi: string; // <-- pastikan ini ada
}

export async function searchOngkirDestination(query: string): Promise<OngkirDestination[]> {
  const res = await fetch(`/api/ongkir/destination?search=${encodeURIComponent(query)}`);

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Kuota pencarian kota harian sudah habis, coba lagi nanti");
    }
    throw new Error("Gagal mencari kota");
  }

  const json = await res.json();
  return (json.data ?? []).map((d: { id: number; label?: string; subdistrict_name?: string; city_name?: string; province_name?: string }) => ({
    id: d.id,
    label: d.label ?? `${d.subdistrict_name ?? ""}, ${d.city_name ?? ""}, ${d.province_name ?? ""}`,
    provinsi: d.province_name ?? "",
  }));
}