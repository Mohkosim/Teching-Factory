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

const produkDetailInclude = {
  foto: true,
  barang: true,
  jurusan: { include: { smk: { include: { user: true } } } },
  review: {
    include: { user: true, foto: true },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

type ProdukDetailWithRelations = Prisma.ProdukGetPayload<{
  include: typeof produkDetailInclude;
}>;

export interface ReviewPublicItem {
  id: string;
  namaSamaran: string;
  rating: number;
  komentar: string;
  waktu: string;
  createdAtRaw: string;
  fotos: string[];
}

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
  kondisi: string | null;
  // Field tambahan khusus halaman detail (hanya diisi oleh getProdukDetailById)
  ratingBreakdown?: Record<1 | 2 | 3 | 4 | 5, number>;
  persentasePuas?: number;
  reviews?: ReviewPublicItem[];
}

export interface ProdukPublicListResult {
  data: ProdukPublicItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const PUBLISHED_WHERE = {
  status_publikasi: "Published",
  status: { not: "Nonaktif" },
} as const;

function getBadge(p: ProdukWithRelations | ProdukDetailWithRelations): string {
  const isBaru =
    Date.now() - new Date(p.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000;

  if (p.status === "Habis") return "Habis";
  if (p.sold_count >= 20) return "Terlaris";
  if (isBaru) return "Baru";
  return "Tersedia";
}

function maskNama(name: string): string {
  const trimmed = (name || "Pengguna").trim();
  if (trimmed.length <= 2) return `${trimmed[0] ?? "?"}***`;
  return `${trimmed[0]}***${trimmed[trimmed.length - 1]}`;
}

function formatWaktuUlasan(date: Date): string {
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (diffDays < 1) return "Hari ini";
  if (diffDays < 30) return `${diffDays} hari lalu`;
  const diffBulan = Math.floor(diffDays / 30);
  if (diffBulan < 12) return `${diffBulan} bulan lalu`;
  return "Lebih dari 1 tahun lalu";
}

function mapProdukPublicItem(p: ProdukWithRelations | ProdukDetailWithRelations): ProdukPublicItem {
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
    lokasi: p.jurusan.smk?.provinsi ?? "",
    badge: getBadge(p),
    kondisi: p.barang[0]?.kondisi ?? null,
  };
}

function mapProdukDetailItem(p: ProdukDetailWithRelations): ProdukPublicItem {
  const base = mapProdukPublicItem(p);

  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  p.review.forEach((r) => {
    const bintang = r.rating as 1 | 2 | 3 | 4 | 5;
    if (breakdown[bintang] !== undefined) breakdown[bintang] += 1;
  });

  const puas = p.review.filter((r) => r.rating >= 4).length;
  const persentasePuas = p.review.length > 0 ? Math.round((puas / p.review.length) * 100) : 0;

  const reviews: ReviewPublicItem[] = p.review.map((r) => ({
    id: r.review_id,
    namaSamaran: maskNama(r.user.name),
    rating: r.rating,
    komentar: r.komentar ?? "",
    waktu: formatWaktuUlasan(r.createdAt),
    createdAtRaw: r.createdAt.toISOString(),
    fotos: r.foto.map((f) => f.url),
  }));

  return { ...base, ratingBreakdown: breakdown, persentasePuas, reviews };
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

export async function getProdukPublicList(): Promise<ProdukPublicItem[]>;
export async function getProdukPublicList(
  params: GetProdukListParams
): Promise<ProdukPublicListResult>;
export async function getProdukPublicList(
  params?: GetProdukListParams
): Promise<ProdukPublicItem[] | ProdukPublicListResult> {
  if (!params) {
    const produkList = await prisma.produk.findMany({
      where: { ...PUBLISHED_WHERE, barang: { some: {} } },
      include: produkPublicInclude,
      orderBy: { createdAt: "desc" },
    });

    return produkList.map(mapProdukPublicItem);
  }

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
    data: items.map(mapProdukPublicItem),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    currentPage: page,
  };
}

export async function getProdukDetailById(
  id: string
): Promise<ProdukPublicItem | null> {
  const p = await prisma.produk.findUnique({
    where: { produk_id: id },
    include: produkDetailInclude,
  });

  if (!p || p.status_publikasi !== "Published" || p.status === "Nonaktif") {
    return null;
  }

  return mapProdukDetailItem(p);
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
    gambar: fotos[0] ?? "",
    badge: getBadge(p),
    rating: avgRating,
    jumlahReview: p.review.length,
    sekolah: p.jurusan.smk?.user.name ?? "",
  };
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