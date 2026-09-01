import { prisma } from "@/lib/prisma";

export type StatusPenarikan = "Pending" | "Diproses" | "Selesai" | "Ditolak";

export interface PenarikanSaldoRow {
    penarikanId: string;
    tanggal: string;
    jurusan: string;
    smk: string;
    nominal: number;
    metode: string;
    nomorRekening: string;
    atasNama: string;
    status: StatusPenarikan;
    diajukanOleh: string;
}

function formatTanggal(d: Date): string {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(d);
}

export async function getPenarikanSaldoList(): Promise<PenarikanSaldoRow[]> {
    const rows = await prisma.penarikanSaldo.findMany({
        include: {
            jurusan: { include: { smk: { include: { user: true } } } },
            user: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
        penarikanId: r.penarikan_id,
        tanggal: formatTanggal(r.createdAt),
        jurusan: r.jurusan.nama_jurusan,
        smk: r.jurusan.smk.user.name,
        nominal: r.nominal,
        metode: r.nama_bank,
        nomorRekening: r.nomor_rekening,
        atasNama: r.atas_nama,
        status: r.status,
        diajukanOleh: r.user.name,
    }));
}