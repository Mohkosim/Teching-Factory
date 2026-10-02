import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    getLaporanKeuanganData,
    hitungSaldoDariJurnal,
    getPenarikanList,
} from "@/lib/data/laporan-keuangan";
import { getAkuntansiJurusan } from "@/lib/akuntansi/loader";
import { tanggalWIB } from "@/lib/akuntansi/engine";
import LaporanKeuanganClient from "./LaporanKeuanganClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laporan Keuangan Jurusan",
};

export const dynamic = "force-dynamic";

export default async function LaporanKeuanganPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/auth/login");

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan) redirect("/");

    const [{ transaksi }, { jurnal, peringatan }, penarikanList] = await Promise.all([
        getLaporanKeuanganData(jurusan.jurusan_id),
        getAkuntansiJurusan(jurusan.jurusan_id),
        getPenarikanList(jurusan.jurusan_id),
    ]);
    const hariIni = tanggalWIB(new Date());
    const saldo = hitungSaldoDariJurnal(jurnal, hariIni);

    return (
        <LaporanKeuanganClient
            initialTransaksi={transaksi}
            jurnal={jurnal}
            peringatan={peringatan}
            namaJurusan={jurusan.nama_jurusan}
            hariIni={hariIni}
            saldo={saldo}
            penarikanList={penarikanList}
        />
    );
}