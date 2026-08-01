import { prisma } from "@/lib/prisma";
import type { JurusanAccount } from "@/types/interfaces/accountAdmin";

export async function getJurusanAccounts(adminSmkUserId: string): Promise<JurusanAccount[]> {
    const smk = await prisma.sMK.findUnique({
        where: { user_id: adminSmkUserId },
        include: {
            jurusans: {
                include: {
                    user: true,
                    _count: { select: { produk: true } },
                },
            },
        },
    });

    if (!smk) return [];

    return smk.jurusans.map((j) => ({
        jurusan_id: j.jurusan_id,
        user_id: j.user_id,
        smk_id: j.smk_id,
        nama_jurusan: j.nama_jurusan,
        deskripsi: j.deskripsi,
        kepala_jurusan: j.kepala_jurusan,
        jam_operasional: j.jam_operasional,
        name: j.user.name,
        email: j.user.email,
        phoneNumber: j.user.phone,
        isActive: j.user.isActive,
        totalProduk: j._count.produk,
    }));
}