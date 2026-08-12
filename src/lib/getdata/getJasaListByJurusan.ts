"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ProdukSortOption, ProdukTypeFilter } from "@/types/interfaces/produk";
import { JasaListResult } from "@/types/interfaces/jasa";

interface GetJasaListArgs {
  jurusanId: string;
  page: number;
  perPage: number;
  sort: ProdukSortOption;
  type: ProdukTypeFilter;
  search?: string;
}

function buildOrderBy(sort: ProdukSortOption): Prisma.JasaOrderByWithRelationInput {
  switch (sort) {
    case "nama_asc":
      return { produk: { nama_produk: "asc" } };
    case "nama_desc":
      return { produk: { nama_produk: "desc" } };
    case "harga_asc":
      return { produk: { harga: "asc" } };
    case "harga_desc":
      return { produk: { harga: "desc" } };
    case "terlaris":
      return { total_project: "desc" };
    case "terbaru":
    default:
      return { createdAt: "desc" };
  }
}

export async function getJasaListByJurusan({
  jurusanId,
  page,
  perPage,
  sort,
  type,
  search,
}: GetJasaListArgs): Promise<JasaListResult> {
  // type "produk" berarti section Jasa tidak perlu ditampilkan sama sekali
  if (type === "produk") {
    return { data: [], totalCount: 0, totalPages: 1, currentPage: page };
  }

  const where: Prisma.JasaWhereInput = {
    produk: {
      jurusan_id: jurusanId,
      status_publikasi: "Published",
      ...(search ? { nama_produk: { contains: search, mode: "insensitive" } } : {}),
    },
  };

  const [jasaData, totalCount] = await Promise.all([
    prisma.jasa.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        jasa_id: true,
        produk_id: true,
        estimasi_pengerjaan: true,
        total_project: true,
        produk: {
          select: {
            nama_produk: true,
            harga: true,
            foto: { take: 1, select: { url: true } },
            review: { select: { rating: true } },
            jurusan: {
              select: {
                nama_jurusan: true,
                smk: { select: { user: { select: { name: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.jasa.count({ where }),
  ]);

  return {
    data: jasaData.map((j) => {
      const ratings = j.produk.review.map((r) => r.rating);
      const avgRating = ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

      return {
        jasa_id: j.jasa_id,
        produk_id: j.produk_id,
        nama_jasa: j.produk.nama_produk,
        harga: j.produk.harga,
        foto: j.produk.foto[0]?.url ?? null,
        estimasi_pengerjaan: j.estimasi_pengerjaan,
        total_project: j.total_project,
        jurusan_nama: j.produk.jurusan.nama_jurusan,
        smk_nama: j.produk.jurusan.smk.user.name,
        rating: Math.round(avgRating * 10) / 10,
        jumlahReview: ratings.length,
      };
    }),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    currentPage: page,
  };
}