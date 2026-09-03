export function formatAngka(value: number | string): string {
    const num = typeof value === "string" ? Number(value) : value;
    return new Intl.NumberFormat("id-ID").format(isNaN(num) ? 0 : num);
}

export function formatRupiah(value: number | string): string {
    return `Rp ${formatAngka(value)}`;
}

export function formatNominalInput(value: string): string {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return "";
    return formatAngka(digitsOnly);
}