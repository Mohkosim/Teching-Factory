import type { StatusPublikasi } from "@/generated/prisma/client";

export function statusPublikasiSetelahEdit(
    statusSaatIni: StatusPublikasi,
    infoInti: { berubah: boolean }
): StatusPublikasi | undefined {
    if (statusSaatIni === "Revisi") return "Pending";
    if (statusSaatIni === "Published" && infoInti.berubah) return "Pending";
    return undefined;
}

export function daftarBerbeda(lama: readonly string[], baru: readonly string[]): boolean {
    if (lama.length !== baru.length) return true;
    const a = [...lama].sort();
    const b = [...baru].sort();
    return a.some((v, i) => v !== b[i]);
}

export function teksBerbeda(lama: string | null | undefined, baru: string | null | undefined): boolean {
    return (lama ?? "").trim() !== (baru ?? "").trim();
}
