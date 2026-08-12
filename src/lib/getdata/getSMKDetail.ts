"use server";

import { prisma } from "@/lib/prisma";
import { SMKDetailData } from "@/types/interfaces/smk";

export async function getSMKDetail(smkId: string): Promise<SMKDetailData | null> {
  const smk = await prisma.sMK.findUnique({
    where: { smk_id: smkId },
    select: {
      smk_id: true,
      deskripsi: true,
      alamat: true,
      kota: true,
      provinsi: true,
      map_link: true,
      status_verifikasi: true,
      user: { select: { name: true, img: true } },
      _count: { select: { jurusans: true } },
    },
  });

  if (!smk) return null;

  return {
    smk_id: smk.smk_id,
    nama_smk: smk.user.name,
    img: smk.user.img,
    deskripsi: smk.deskripsi,
    alamat: smk.alamat,
    kota: smk.kota,
    provinsi: smk.provinsi,
    map_link: smk.map_link,
    status_verifikasi: smk.status_verifikasi,
    jumlahJurusan: smk._count.jurusans,
  };
}