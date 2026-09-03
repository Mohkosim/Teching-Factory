export function mapKodeKurir(namaKurir: string): string {
  const map: Record<string, string> = { JNE: "jne", "J&T": "jnt", SiCepat: "sicepat" };
  return map[namaKurir] ?? namaKurir.toLowerCase();
}