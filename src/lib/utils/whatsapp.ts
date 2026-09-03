export function formatNomorWhatsapp(nomor: string): string {
  const digits = nomor.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
}

export function buildWhatsappLink(nomor: string, pesan?: string): string {
  const nomorFormatted = formatNomorWhatsapp(nomor);
  const base = `https://wa.me/${nomorFormatted}`;
  return pesan ? `${base}?text=${encodeURIComponent(pesan)}` : base;
}