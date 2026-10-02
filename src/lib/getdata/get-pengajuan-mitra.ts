import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { PengajuanMitraItem } from "@/types/interfaces/accountAdmin";
import { bersihkanPendaftaranSmkKedaluwarsa } from "@/lib/utils/pengajuan-mitra-cleanup";

export async function getPengajuanMitraMenunggu(): Promise<PengajuanMitraItem[]> {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SuperAdmin") {
        redirect("/auth/login");
    }

    await bersihkanPendaftaranSmkKedaluwarsa();

    const data = await prisma.pengajuanMitraSMK.findMany({
        where: { status: "Menunggu" },
        orderBy: { createdAt: "asc" },
        include: {
            user: { select: { name: true, email: true } },
        },
    });

    return data.map((p) => ({
        pengajuan_id: p.pengajuan_id,
        namaSekolah: p.namaSekolah,
        npsn: p.npsn,
        namaPenanggungJawab: p.namaPenanggungJawab,
        noHpPenanggungJawab: p.noHpPenanggungJawab,
        status: p.status as "Menunggu" | "Disetujui" | "Ditolak",
        catatanAdmin: p.catatanAdmin,
        createdAt: p.createdAt.toISOString(),
        pendaftar: { name: p.user.name, email: p.user.email },
    }));
}
