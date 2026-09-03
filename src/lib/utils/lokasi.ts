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


export function getProvinsiUnik<T extends { provinsi?: string }>(items: T[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (item.provinsi) set.add(item.provinsi);
  }
  return Array.from(set).sort();
}