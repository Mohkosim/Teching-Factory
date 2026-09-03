import { redirect } from "next/navigation";
import Link from "next/link";
import { getProdukDetailById, getProdukRekomendasi } from "@/lib/data/produk-public";
import { getFavoritIds } from "@/lib/data/favorit-public";
import ProdukDetailClient from "./ProdukDetailClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detail Produk",
};

export default async function ProdukDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    redirect("/produk");
  }

  const produk = await getProdukDetailById(id);

  if (!produk) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-gray-400">Produk tidak ditemukan</p>
        <Link href="/produk" className="mt-3 inline-block text-sm font-medium text-sky-500 hover:underline">
          Kembali ke daftar produk
        </Link>
      </div>
    );
  }

  const rekomendasi = await getProdukRekomendasi(produk.id);
  const favoritIds = await getFavoritIds();
  const initialFavorited = favoritIds.produkIds.includes(produk.id);
  
  return (
    <ProdukDetailClient
      key={produk.id}
      produk={produk}
      rekomendasi={rekomendasi}
      initialFavorited={initialFavorited}
      favoritIds={favoritIds}
    />
  );
}