/**
 * Menormalisasi teks provinsi supaya konsisten (Title Case),
 * karena data provinsi di database bisa punya variasi kapitalisasi
 * (mis. "JAWA TIMUR" vs "Jawa Timur") tergantung input SMK saat registrasi.
 */
export function normalizeProvinsi(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  return trimmed
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Mengambil daftar provinsi unik (sudah dinormalisasi) dari sebuah list item
 * yang punya field provinsi opsional. Berguna untuk membangun opsi filter lokasi.
 */
export function getProvinsiUnik<T extends { provinsi?: string }>(items: T[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (item.provinsi) set.add(item.provinsi);
  }
  return Array.from(set).sort();
}