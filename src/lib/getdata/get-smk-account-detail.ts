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
                        },
                    },
                },
            },
        },
    });

    if (!user || user.role !== "AdminSMK") return null;

    const smk = user.smk;

    const jurusanIds = (smk?.jurusans ?? []).map((j) => j.jurusan_id);
    const produkRows = jurusanIds.length
        ? await prisma.produk.findMany({
              where: { jurusan_id: { in: jurusanIds } },
              select: {
                  jurusan_id: true,
                  _count: { select: { barang: true, jasa: true } },
              },
          })
        : [];

    const totalPerJurusan = new Map<string, { produk: number; jasa: number }>();
    for (const row of produkRows) {
        const total = totalPerJurusan.get(row.jurusan_id) ?? { produk: 0, jasa: 0 };
        if (row._count.barang > 0) total.produk += 1;
        total.jasa += row._count.jasa;
        totalPerJurusan.set(row.jurusan_id, total);
    }

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
            totalProduk: totalPerJurusan.get(j.jurusan_id)?.produk ?? 0,
            totalJasa: totalPerJurusan.get(j.jurusan_id)?.jasa ?? 0,
        })),
    };
}