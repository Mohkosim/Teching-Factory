import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSmkIdByUser, getTransaksiSmk } from "@/lib/data/laporan-keuangan-smk";
import { getAkuntansiJurusan } from "@/lib/akuntansi/loader";
import { tanggalWIB } from "@/lib/akuntansi/engine";
import LaporanKeuanganClient from "./LaporanKeuanganClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laporan Keuangan SMK",
};

export const dynamic = "force-dynamic";

export default async function LaporanKeuanganPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminSMK") {
        redirect("/auth/login");
    }

    const smk_id = await getSmkIdByUser(session.user.id);
    if (!smk_id) {
        redirect("/auth/login");
    }

    const smk = await prisma.sMK.findUnique({
        where: { smk_id },
        select: {
            user: { select: { name: true } },
            jurusans: { select: { jurusan_id: true, nama_jurusan: true }, orderBy: { nama_jurusan: "asc" } },
        },
    });

    const [transaksi, jurusanList] = await Promise.all([
        getTransaksiSmk(smk_id),
        Promise.all(
            (smk?.jurusans ?? []).map(async (j) => {
                const { jurnal, peringatan } = await getAkuntansiJurusan(j.jurusan_id);
                return { id: j.jurusan_id, nama: j.nama_jurusan, jurnal, peringatan };
            }),
        ),
    ]);

    return (
        <LaporanKeuanganClient
            initialTransaksi={transaksi}
            namaSmk={smk?.user.name ?? "SMK"}
            jurusanList={jurusanList}
            hariIni={tanggalWIB(new Date())}
        />
    );
}