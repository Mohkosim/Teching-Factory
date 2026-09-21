import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { SMKAccountDetail } from "@/types/interfaces/accountAdmin";

export async function getSMKAccountDetail(userId: string): Promise<SMKAccountDetail | null> {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SuperAdmin") {
        redirect("/auth/login");
    }

    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: {
            smk: {
                include: {
                    jurusans: {
                        orderBy: { createdAt: "asc" },
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    phone: true,
                                    img: true,
                                    isActive: true,
                                },
                            },
                            _count: { select: { produk: true } },
                        },
                    },
                },
            },
        },
    });

    if (!user || user.role !== "AdminSMK") return null;

    const smk = user.smk;

    return {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        img: user.img ?? null,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        smk: smk
            ? {
                  smk_id: smk.smk_id,
                  kepala_sekolah: smk.kepala_sekolah ?? null,
                  deskripsi: smk.deskripsi ?? null,
                  alamat: smk.alamat,
                  kecamatan: smk.kecamatan ?? null,
                  kota: smk.kota,
                  kode_pos: smk.kode_pos ?? null,
                  provinsi: smk.provinsi,
                  latitude: smk.latitude ?? null,
                  longitude: smk.longitude ?? null,
                  tahun_berdiri: smk.tahun_berdiri,
              }
            : null,
        jurusans: (smk?.jurusans ?? []).map((j) => ({
            jurusan_id: j.jurusan_id,
            user_id: j.user_id,
            smk_id: j.smk_id,
            img: j.user.img ?? null,
            nama_jurusan: j.nama_jurusan,
            deskripsi: j.deskripsi ?? null,
            kepala_jurusan: j.kepala_jurusan ?? null,
            jam_operasional: j.jam_operasional ?? null,
            name: j.user.name,
            email: j.user.email,
            phoneNumber: j.user.phone ?? null,
            isActive: j.user.isActive,
            totalProduk: j._count.produk,
        })),
    };
}
