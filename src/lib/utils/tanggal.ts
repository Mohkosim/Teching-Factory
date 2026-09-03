export function parseTanggalToDate(ddmmyyyy: string): Date | null {
    const parts = ddmmyyyy.split("/");
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
}

export function formatDateRangeLabel(from: string, to: string): string {
    if (!from && !to) return "Semua Tanggal";
    const fmt = (s: string) => {
        if (!s) return "...";
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
    };
    return `${fmt(from)} - ${fmt(to)}`;
}

export function toDateInputValue(ddmmyyyy: string): string {
    const parts = ddmmyyyy.split("/");
    if (parts.length !== 3) return "";
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}