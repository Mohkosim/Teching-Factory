"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ProdukSortOption } from "@/types/interfaces/produk";

export interface JasaPublicItem {
  id: string;
  nama: string;
  deskripsi: string;
  harga: number;
  dipesan: number;
  gambar: string;
  fotos: string[];
  estimasiPengerjaan?: string;
  lokasi?: string;
  rating: number;
  jumlahReview: number;
  jurusan: string;
  sekolah: string;
}

export interface JasaListResult {
  data: JasaPublicItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface GetJasaListParams {
  jurusanId?: string;
  search?: string;
  sort?: ProdukSortOption;
  page?: number;
  perPage?: number;
}

const jasaInclude = {
  foto: true,
  jasa: true,
  jurusan: { include: { smk: { include: { user: true } } } },
  review: true,
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _shapeJasaProduk() {
  return prisma.produk.findFirstOrThrow({ include: jasaInclude });
}

type ProdukWithJasa = Awaited<ReturnType<typeof _shapeJasaProduk>>;

function mapJasaPublicItem(p: ProdukWithJasa): JasaPublicItem {
  const avgRating =
    p.review.length > 0
      ? p.review.reduce((sum, r) => sum + r.rating, 0) / p.review.length
      : 0;

  return {
    id: p.produk_id,
    nama: p.nama_produk,
    deskripsi: p.deskripsi ?? "",
    harga: p.harga,
    dipesan: p.jasa.reduce((sum, j) => sum + (j.total_project ?? 0), 0),
    gambar: p.foto[0]?.url ?? "",
    fotos: p.foto.map((f) => f.url),
    estimasiPengerjaan: p.jasa[0]?.estimasi_pengerjaan ?? undefined,
    lokasi: p.jurusan.smk?.alamat,
    rating: avgRating,
    jumlahReview: p.review.length,
    jurusan: p.jurusan.nama_jurusan,
    sekolah: p.jurusan.smk?.user.name ?? "",
  };
}

function getJasaOrderBy(sort: ProdukSortOption): Prisma.ProdukOrderByWithRelationInput {
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

const PUBLISHED_WHERE = {
  status_publikasi: "Published",
  status: { not: "Nonaktif" },
} as const;

export async function getJasaPublicList(): Promise<JasaPublicItem[]> {
  const produkList = await prisma.produk.findMany({
    where: { ...PUBLISHED_WHERE, jasa: { some: {} } },
    include: jasaInclude,
    orderBy: { createdAt: "desc" },
  });

  return produkList.map(mapJasaPublicItem);
}

export async function getJasaDetailById(id: string): Promise<JasaPublicItem | null> {
  const p = await prisma.produk.findUnique({
    where: { produk_id: id },
    include: jasaInclude,
  });

  if (!p || p.status_publikasi !== "Published" || p.status === "Nonaktif") {
    return null;
  }

  return mapJasaPublicItem(p);
}

export async function getJasaRekomendasi(excludeId: string, limit = 3): Promise<JasaPublicItem[]> {
  const produkList = await prisma.produk.findMany({
    where: {
      ...PUBLISHED_WHERE,
      produk_id: { not: excludeId },
      jasa: { some: {} },
    },
    include: jasaInclude,
    orderBy: { sold_count: "desc" },
    take: limit,
  });

  return produkList.map(mapJasaPublicItem);
}

/**
 * Dipakai di halaman detail Jurusan: list jasa dengan filter jurusan,
 * search, sort, dan pagination.
 */
export async function getJasaListByJurusan(params: GetJasaListParams): Promise<JasaListResult> {
  const { jurusanId, search = "", sort = "terbaru", page = 1, perPage = 10 } = params;

  const where: Prisma.ProdukWhereInput = {
    ...PUBLISHED_WHERE,
    jasa: { some: {} },
    ...(jurusanId ? { jurusan_id: jurusanId } : {}),
    ...(search ? { nama_produk: { contains: search, mode: "insensitive" } } : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.produk.findMany({
      where,
      include: jasaInclude,
      orderBy: getJasaOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.produk.count({ where }),
  ]);

  return {
    data: items.map(mapJasaPublicItem),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    currentPage: page,
  };
}