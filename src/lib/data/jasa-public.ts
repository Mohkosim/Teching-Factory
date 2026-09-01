"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ProdukSortOption } from "@/types/interfaces/produk";
import type { ReviewPublicItem } from "@/lib/data/produk-public";
import { normalizeProvinsi } from "@/lib/utils/lokasi";

export interface PortofolioPublicItem {
  portofolio_id: string;
  file_path: string;
  deskripsi: string | null;
}

export interface JasaPublicItem {
  id: string;
  jasaId: string;
  nama: string;
  deskripsi: string;
  harga: number;
  dipesan: number;
  gambar: string;
  fotos: string[];
  estimasiPengerjaan?: string;
  lokasi?: string;
  provinsi?: string;
  rating: number;
  jumlahReview: number;
  jurusan: string;
  sekolah: string;
  noWhatsapp?: string;
  portofolio: PortofolioPublicItem[]; // <-- TAMBAHAN
  // Field tambahan khusus halaman detail (hanya diisi oleh getJasaDetailById)
  ratingBreakdown?: Record<1 | 2 | 3 | 4 | 5, number>;
  persentasePuas?: number;
  reviews?: ReviewPublicItem[];
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
  jasa: { include: { portofolio: true } }, // <-- TAMBAHAN: sertakan portofolio
  jurusan: { include: { user: true, smk: { include: { user: true } } } },
  review: true,
} as const;

const jasaDetailInclude = {
  foto: true,
  jasa: { include: { portofolio: true } }, // <-- TAMBAHAN: sertakan portofolio
  jurusan: { include: { user: true, smk: { include: { user: true } } } },
  review: {
    include: { user: true, foto: true },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _shapeJasaProduk() {
  return prisma.produk.findFirstOrThrow({ include: jasaInclude });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _shapeJasaProdukDetail() {
  return prisma.produk.findFirstOrThrow({ include: jasaDetailInclude });
}

type ProdukWithJasa = Awaited<ReturnType<typeof _shapeJasaProduk>>;
type ProdukWithJasaDetail = Awaited<ReturnType<typeof _shapeJasaProdukDetail>>;

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

function mapJasaPublicItem(p: ProdukWithJasa | ProdukWithJasaDetail): JasaPublicItem {
  const avgRating =
    p.review.length > 0
      ? p.review.reduce((sum, r) => sum + r.rating, 0) / p.review.length
      : 0;

  return {
    id: p.produk_id,
    jasaId: p.jasa[0]?.jasa_id ?? "",
    nama: p.nama_produk,
    deskripsi: p.deskripsi ?? "",
    harga: p.harga,
    dipesan: p.jasa.reduce((sum, j) => sum + (j.total_project ?? 0), 0),
    gambar: p.foto[0]?.url ?? "",
    fotos: p.foto.map((f) => f.url),
    estimasiPengerjaan: p.jasa[0]?.estimasi_pengerjaan ?? undefined,
    lokasi: p.jurusan.smk?.alamat,
    provinsi: normalizeProvinsi(p.jurusan.smk?.provinsi),
    rating: avgRating,
    jumlahReview: p.review.length,
    jurusan: p.jurusan.nama_jurusan,
    sekolah: p.jurusan.smk?.user.name ?? "",
    noWhatsapp: p.jurusan.user.phone ?? undefined,
    // <-- TAMBAHAN: petakan portofolio dari relasi jasa
    portofolio: (p.jasa[0]?.portofolio ?? []).map((pf) => ({
      portofolio_id: pf.portofolio_id,
      file_path: pf.file_path,
      deskripsi: pf.deskripsi,
    })),
  };
}

function mapJasaDetailItem(p: ProdukWithJasaDetail): JasaPublicItem {
  const base = mapJasaPublicItem(p);

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
    include: jasaDetailInclude,
  });

  if (!p || p.status_publikasi !== "Published" || p.status === "Nonaktif") {
    return null;
  }

  return mapJasaDetailItem(p);
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