import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PengajuanMitraClient from "./pengajuan-mitra-client";

export const metadata: Metadata = {
  title: "Status Pengajuan Mitra",
};

export default async function PengajuanMitraPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  if (session.user.role !== "User") redirect("/profile");

  const terakhir = await prisma.pengajuanMitraSMK.findFirst({
    where: {
      user_id: session.user.id,
      status: { not: "MenungguVerifikasiEmail" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!terakhir) redirect("/profile");

  return (
    <PengajuanMitraClient
      status={terakhir.status as "Menunggu" | "Disetujui" | "Ditolak"}
      catatanAdmin={terakhir.catatanAdmin}
      diprosesAt={terakhir.diprosesAt?.toISOString() ?? null}
      initialData={{
        namaSekolah: terakhir.namaSekolah,
        npsn: terakhir.npsn,
        namaPenanggungJawab: terakhir.namaPenanggungJawab,
        noHpPenanggungJawab: terakhir.noHpPenanggungJawab,
      }}
    />
  );
}
