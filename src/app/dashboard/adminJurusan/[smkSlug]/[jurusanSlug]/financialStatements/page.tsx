import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    getLaporanKeuanganData,
    getSaldoJurusan,
    getPenarikanList,
} from "@/lib/data/laporan-keuangan";
import LaporanKeuanganClient from "./LaporanKeuanganClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laporan Keuangan Jurusan",
};

export default async function LaporanKeuanganPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/auth/login");

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan) redirect("/");

    const [{ transaksi, ringkasan }, saldo, penarikanList] = await Promise.all([
        getLaporanKeuanganData(jurusan.jurusan_id),
        getSaldoJurusan(jurusan.jurusan_id),
        getPenarikanList(jurusan.jurusan_id),
    ]);

    return (
        <LaporanKeuanganClient
            initialTransaksi={transaksi}
            ringkasan={ringkasan}
            saldo={saldo}
            penarikanList={penarikanList}
        />
    );
}