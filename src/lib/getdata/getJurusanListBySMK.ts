"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { JurusanListResult, JurusanSortOption } from "@/types/interfaces/jurusan";

interface GetJurusanListArgs {
  smkId: string;
  page: number;
  perPage: number;
  sort: JurusanSortOption;
}

function buildOrderBy(sort: JurusanSortOption): Prisma.JurusanOrderByWithRelationInput {
  switch (sort) {
    case "nama_asc":
      return { nama_jurusan: "asc" };
    case "nama_desc":
      return { nama_jurusan: "desc" };
    case "produk_terbanyak":
      return { produk: { _count: "desc" } };
    case "terbaru":
    default:
      return { createdAt: "desc" };
  }
}

export async function getJurusanListBySMK({
  smkId,
  page,
  perPage,
  sort,
}: GetJurusanListArgs): Promise<JurusanListResult> {
  const where: Prisma.JurusanWhereInput = { smk_id: smkId };

  const [jurusanData, totalCount] = await Promise.all([
    prisma.jurusan.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        jurusan_id: true,
        nama_jurusan: true,
        deskripsi: true,
        _count: { select: { produk: true } },
      },
    }),
    prisma.jurusan.count({ where }),
  ]);

  return {
    data: jurusanData.map((j) => ({
      jurusan_id: j.jurusan_id,
      nama_jurusan: j.nama_jurusan,
      deskripsi: j.deskripsi,
      jumlahProduk: j._count.produk,
    })),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    currentPage: page,
  };
}