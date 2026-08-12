import { prisma } from "@/lib/prisma";
import { SMKListResult, SMKSortOption } from "@/types/interfaces/smk";
import { Prisma } from "@/generated/prisma/client";

interface GetSMKListArgs {
  page: number;
  perPage: number;
  sort: SMKSortOption;
  search?: string;
}

function buildOrderBy(sort: SMKSortOption): Prisma.SMKOrderByWithRelationInput {
  switch (sort) {
    case "nama_asc":
      return { user: { name: "asc" } };
    case "nama_desc":
      return { user: { name: "desc" } };
    case "jurusan_terbanyak":
      return { jurusans: { _count: "desc" } };
    case "terbaru":
    default:
      return { createdAt: "desc" };
  }
}

export async function getSMKList({
  page,
  perPage,
  sort,
  search,
}: GetSMKListArgs): Promise<SMKListResult> {
  const where: Prisma.SMKWhereInput = search
    ? {
        user: {
          name: { contains: search, mode: "insensitive" },
        },
      }
    : {};

  const [smkData, totalCount] = await Promise.all([
    prisma.sMK.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        smk_id: true,
        kota: true,
        provinsi: true,
        status_verifikasi: true,
        user: {
          select: { name: true, img: true },
        },
        _count: { select: { jurusans: true } },
      },
    }),
    prisma.sMK.count({ where }),
  ]);

  return {
    data: smkData.map((smk) => ({
      smk_id: smk.smk_id,
      nama_smk: smk.user.name,
      img: smk.user.img,
      kota: smk.kota,
      provinsi: smk.provinsi,
      status_verifikasi: smk.status_verifikasi,
      jumlahJurusan: smk._count.jurusans,
    })),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    currentPage: page,
  };
}