"use server";

import { prisma } from "@/lib/prisma";
import { JurusanDetailData } from "@/types/interfaces/jurusan";

export async function getJurusanDetail(jurusanId: string): Promise<JurusanDetailData | null> {
  const jurusan = await prisma.jurusan.findUnique({
    where: { jurusan_id: jurusanId },
    include: {
      user: true,
      smk: { include: { user: true } },
      produk: {
        include: { barang: true, jasa: true },
      },
    },
  });

  if (!jurusan) return null;

  const jumlahBarang = jurusan.produk.filter((p) => p.barang.length > 0).length;
  const jumlahJasa = jurusan.produk.filter((p) => p.jasa.length > 0).length;

  return {
    jurusan_id: jurusan.jurusan_id,
    nama_jurusan: jurusan.nama_jurusan,
    deskripsi: jurusan.deskripsi,
    kepala_jurusan: jurusan.kepala_jurusan,
    jam_operasional: jurusan.jam_operasional,

    img: jurusan.user.img,

    smk_id: jurusan.smk_id,
    smk_nama: jurusan.smk.user.name,

    jumlahBarang,
    jumlahJasa,
  };
}