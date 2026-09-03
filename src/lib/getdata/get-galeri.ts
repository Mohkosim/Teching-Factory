import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Prisma, KategoriGaleri } from "@/generated/prisma/client";
import type {
  GaleriItem,
  GaleriListResult,
  GaleriSortOption,
  GaleriKategoriFilter,
} from "@/types/interfaces/galeri";

// Shared select — dipakai di kedua function biar field-nya selalu konsisten
const GALERI_SELECT = {
  galeri_id: true,
  judul: true,
  deskripsi: true,
  kategori: true,
  image: true,
  user: {
    select: { name: true },
  },
} satisfies Prisma.GaleriSelect;

function buildOrderBy(sort: GaleriSortOption): Prisma.GaleriOrderByWithRelationInput {
  switch (sort) {
    case "judul_asc":
      return { judul: "asc" };
    case "judul_desc":
      return { judul: "desc" };
    case "terlama":
      return { createdAt: "asc" };
    case "terbaru":
    default:
      return { createdAt: "desc" };
  }
}


interface GetGaleriListArgs {
  page: number;
  perPage: number;
  sort: GaleriSortOption;
  search?: string;
  kategori?: GaleriKategoriFilter;
}

export async function getGaleriList({
  page,
  perPage,
  sort,
  search,
  kategori,
}: GetGaleriListArgs): Promise<GaleriListResult> {
  const where: Prisma.GaleriWhereInput = {
    ...(search ? { judul: { contains: search, mode: "insensitive" } } : {}),
    ...(kategori && kategori !== "Semua"
      ? { kategori: kategori as KategoriGaleri }
      : {}),
  };

  const [galeriData, totalCount] = await Promise.all([
    prisma.galeri.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: GALERI_SELECT,
    }),
    prisma.galeri.count({ where }),
  ]);

  return {
    data: galeriData,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    currentPage: page,
  };
}


export async function getMyGaleriList(): Promise<GaleriItem[]> {
  const session = await getServerSession(authOptions);
  if (!session || !["AdminSMK", "AdminJurusan"].includes(session.user.role)) {
    redirect("/login");
  }

  const galeriList = await prisma.galeri.findMany({
    where: { user_id: session.user.id },
    orderBy: { createdAt: "desc" },
    select: GALERI_SELECT,
  });

  return galeriList;
}