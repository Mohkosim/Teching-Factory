import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
    getSmkIdByUser,
    getTransaksiSmk,
    getRingkasanSmk,
    getPengeluaranBreakdownSmk,
    getPemasukanBreakdownSmk,
} from "@/lib/data/laporan-keuangan-smk";
import LaporanKeuanganClient from "./LaporanKeuanganClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laporan Keuangan SMK",
};

export default async function LaporanKeuanganPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminSMK") {
        redirect("/login");
    }

    const smk_id = await getSmkIdByUser(session.user.id);
    if (!smk_id) {
        redirect("/login");
    }

    const [transaksi, ringkasan, pengeluaranBreakdown, pemasukanBreakdown] = await Promise.all([
        getTransaksiSmk(smk_id),
        getRingkasanSmk(smk_id),
        getPengeluaranBreakdownSmk(smk_id),
        getPemasukanBreakdownSmk(smk_id),
    ]);

    return (
        <LaporanKeuanganClient
            initialTransaksi={transaksi}
            ringkasan={ringkasan}
            pengeluaranBreakdown={pengeluaranBreakdown}
            pemasukanBreakdown={pemasukanBreakdown}
        />
    );
}