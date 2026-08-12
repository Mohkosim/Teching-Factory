"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  ProdukListResult,
  ProdukSortOption,
  ProdukTypeFilter,
} from "@/types/interfaces/produk";

interface GetProdukListArgs {
  jurusanId: string;
  page: number;
  perPage: number;
  sort: ProdukSortOption;
  type: ProdukTypeFilter;
  search?: string;
}

function buildOrderBy(sort: ProdukSortOption): Prisma.ProdukOrderByWithRelationInput {
  switch (sort) {
    case "nama_asc":
      return { nama_produk: "asc" };
    case "nama_desc":
      return { nama_produk: "desc" };
    case "harga_asc":
      return { harga: "asc" };
    case "harga_desc":
      return { harga: "desc" };
    case "terlaris":
      return { sold_count: "desc" };
    case "terbaru":
    default:
      return { createdAt: "desc" };
  }
}

export async function getProdukListByJurusan({
  jurusanId,
  page,
  perPage,
  sort,
  type,
  search,
}: GetProdukListArgs): Promise<ProdukListResult> {
  // type "jasa" berarti section Produk tidak perlu ditampilkan sama sekali
  if (type === "jasa") {
    return { data: [], totalCount: 0, totalPages: 1, currentPage: page };
  }

  const where: Prisma.ProdukWhereInput = {
    jurusan_id: jurusanId,
    status_publikasi: "Published",
    barang: { some: {} }, // selalu filter hanya produk yang punya child Barang
    ...(search ? { nama_produk: { contains: search, mode: "insensitive" } } : {}),
  };

  const [produkData, totalCount] = await Promise.all([
    prisma.produk.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        produk_id: true,
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
    }),
    prisma.produk.count({ where }),
  ]);

  return {
    data: produkData.map((p) => {
      const ratings = p.review.map((r) => r.rating);
      const avgRating = ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

      return {
        produk_id: p.produk_id,
        nama_produk: p.nama_produk,
        harga: p.harga,
        tipe: "Barang" as const,
        foto: p.foto[0]?.url ?? null,
        jurusan_nama: p.jurusan.nama_jurusan,
        smk_nama: p.jurusan.smk.user.name,
        rating: Math.round(avgRating * 10) / 10,
        jumlahReview: ratings.length,
      };
    }),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    currentPage: page,
  };
}