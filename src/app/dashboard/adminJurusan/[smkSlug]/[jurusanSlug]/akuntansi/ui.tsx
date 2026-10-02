import type { ReactNode } from "react";
import { formatRupiah } from "@/lib/utils/format";

export function rp(n: number): string {
    return n < 0 ? `-${formatRupiah(-n)}` : formatRupiah(n);
}

export function tanggalID(iso: string): string {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

export function Panel({ judul, kanan, children }: { judul?: string; kanan?: ReactNode; children: ReactNode }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {(judul || kanan) && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    {judul && <h3 className="text-base font-semibold text-gray-800">{judul}</h3>}
                    {kanan}
                </div>
            )}
            {children}
        </div>
    );
}

export function Lencana({ ok, teksOk = "Seimbang", teksTidak = "Tidak Seimbang" }: { ok: boolean; teksOk?: string; teksTidak?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {ok ? teksOk : teksTidak}
        </span>
    );
}

export function Kartu({ label, nilai, ok }: { label: string; nilai: string; ok?: boolean }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`mt-0.5 font-mono text-base font-semibold ${ok === undefined ? "text-gray-800" : ok ? "text-emerald-600" : "text-red-600"}`}>{nilai}</p>
        </div>
    );
}

/** Satu baris laporan: label di kiri, nilai di kanan. */
export function BarisLaporan({
    label,
    nilai,
    tebal,
    menjorok,
    garisAtas,
    warna,
}: {
    label: string;
    nilai: number;
    tebal?: boolean;
    menjorok?: boolean;
    garisAtas?: boolean;
    warna?: "hijau" | "merah";
}) {
    return (
        <div className={`flex items-center justify-between py-1.5 text-sm ${garisAtas ? "mt-1 border-t border-gray-200 pt-2" : ""} ${tebal ? "font-semibold text-gray-900" : "text-gray-600"}`}>
            <span className={menjorok ? "pl-5" : ""}>{label}</span>
            <span className={`font-mono ${warna === "hijau" ? "text-emerald-600" : warna === "merah" ? "text-red-600" : ""}`}>{rp(nilai)}</span>
        </div>
    );
}

export function Kepala({ children, kanan }: { children: ReactNode; kanan?: boolean }) {
    return <th className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 ${kanan ? "text-right" : "text-left"}`}>{children}</th>;
}

export function Sel({ children, kanan, mono, kelas = "" }: { children: ReactNode; kanan?: boolean; mono?: boolean; kelas?: string }) {
    return <td className={`px-3 py-2 text-sm text-gray-700 ${kanan ? "text-right" : ""} ${mono ? "font-mono" : ""} ${kelas}`}>{children}</td>;
}
