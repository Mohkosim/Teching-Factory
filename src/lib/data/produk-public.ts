"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type {
  ProdukItem,
  ProdukSortOption,
  GetProdukListParams,
  ProdukListResult,
} from "@/types/interfaces/produk";

const produkPublicInclude = {
  foto: true,
  barang: true,
  jurusan: { include: { smk: { include: { user: true } } } },
  review: true,
} as const;

type ProdukWithRelations = Prisma.ProdukGetPayload<{
  include: typeof produkPublicInclude;
}>;

// Tipe gabungan yang dipakai ProdukPageClient (card) & ProdukDetailClient (detail)
export interface ProdukPublicItem {
  id: string;
  nama: string;
  deskripsi: string;
  gambar: string;
  fotos: string[];
  harga: number;
  rating: number;
  jumlahReview: number;
  terjual: number;
  stok: number;
  jurusan: string;
  sekolah: string;
  lokasi: string | null;
  badge: string;
}

const PUBLISHED_WHERE = {
  status_publikasi: "Published",
  status: { not: "Nonaktif" },
} as const;

function getBadge(p: ProdukWithRelations): string {
  const isBaru =
    Date.now() - new Date(p.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000;

  if (p.status === "Habis") return "Habis";
  if (p.sold_count >= 20) return "Terlaris";
  if (isBaru) return "Baru";
  return "Tersedia";
}

function mapProdukPublicItem(p: ProdukWithRelations): ProdukPublicItem {
  const avgRating =
    p.review.length > 0
      ? p.review.reduce((sum, r) => sum + r.rating, 0) / p.review.length
      : 0;

  const fotos = p.foto.map((f) => f.url);

  return {
    id: p.produk_id,
    nama: p.nama_produk,
    deskripsi: p.deskripsi ?? "",
    gambar: fotos[0] ?? "",
    fotos: fotos.length > 0 ? fotos : [],
    harga: p.harga,
    rating: avgRating,
    jumlahReview: p.review.length,
    terjual: p.sold_count,
    stok: p.barang.reduce((sum, b) => sum + (b.stok ?? 0), 0),
    jurusan: p.jurusan.nama_jurusan,
    sekolah: p.jurusan.smk?.user.name ?? "",
    lokasi: null,
    badge: getBadge(p),
  };
}

export async function getProdukPublicList(): Promise<ProdukPublicItem[]> {
  const produkList = await prisma.produk.findMany({
    where: { ...PUBLISHED_WHERE, barang: { some: {} } },
    include: produkPublicInclude,
    orderBy: { createdAt: "desc" },
  });

  return produkList.map(mapProdukPublicItem);
}

export async function getProdukDetailById(
  id: string
): Promise<ProdukPublicItem | null> {
  const p = await prisma.produk.findUnique({
    where: { produk_id: id },
    include: produkPublicInclude,
  });

  if (!p || p.status_publikasi !== "Published" || p.status === "Nonaktif") {
    return null;
  }

  return mapProdukPublicItem(p);
}

export async function getProdukRekomendasi(
  excludeId: string,
  limit = 3
): Promise<ProdukPublicItem[]> {
  const produkList = await prisma.produk.findMany({
    where: {
      ...PUBLISHED_WHERE,
      produk_id: { not: excludeId },
      barang: { some: {} },
    },
    include: produkPublicInclude,
    orderBy: { sold_count: "desc" },
    take: limit,
  });

  return produkList.map(mapProdukPublicItem);
}

function mapProdukItem(p: ProdukWithRelations): ProdukItem {
  const avgRating =
    p.review.length > 0
      ? p.review.reduce((sum, r) => sum + r.rating, 0) / p.review.length
      : 0;

  const fotos = p.foto.map((f) => f.url);

  return {
    produk_id: p.produk_id,
    jurusan_id: p.jurusan_id,
    nama_produk: p.nama_produk,
    deskripsi: p.deskripsi ?? null,
    fotos,
    harga: p.harga,
    status: p.status as "Tersedia" | "Habis" | "Nonaktif",
    view_count: p.view_count,
    sold_count: p.sold_count,
    stok: p.barang.reduce((sum, b) => sum + (b.stok ?? 0), 0),
    kondisi: p.barang[0]?.kondisi ?? null,
    nama_jurusan: p.jurusan.nama_jurusan,
    status_publikasi: p.status_publikasi as "Pending" | "Published" | "Revisi",
    catatan_revisi: p.catatan_revisi ?? null,

    // Field tambahan untuk card publik
    gambar: fotos[0] ?? "",
    badge: getBadge(p),
    rating: avgRating,
    jumlahReview: p.review.length,
    sekolah: p.jurusan.smk?.user.name ?? "",
  };
}

function getProdukOrderBy(
  sort: ProdukSortOption
): Prisma.ProdukOrderByWithRelationInput {
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

export async function getProdukListByJurusan(
  params: GetProdukListParams
): Promise<ProdukListResult> {
  const { jurusanId, search = "", sort = "terbaru", page = 1, perPage = 10 } = params;

  const where: Prisma.ProdukWhereInput = {
    ...PUBLISHED_WHERE,
    barang: { some: {} },
    ...(jurusanId ? { jurusan_id: jurusanId } : {}),
    ...(search ? { nama_produk: { contains: search, mode: "insensitive" } } : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.produk.findMany({
      where,
      include: produkPublicInclude,
      orderBy: getProdukOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.produk.count({ where }),
  ]);

  return {
    data: items.map(mapProdukItem),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    currentPage: page,
  };
}