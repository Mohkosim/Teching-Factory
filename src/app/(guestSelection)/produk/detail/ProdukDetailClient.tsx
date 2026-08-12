"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ShoppingCart, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ProdukPublicItem } from "@/lib/data/produk-public";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function ProdukDetailClient({
  produk,
  rekomendasi,
}: {
  produk: ProdukPublicItem;
  rekomendasi: ProdukPublicItem[];
}) {
  const [activeFoto, setActiveFoto] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"deskripsi" | "informasi" | "review">("deskripsi");

  const fotos = produk.fotos.length > 0 ? produk.fotos : [produk.gambar];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <p className="mb-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-sky-500">Toko</Link>
          {" > "}
          <Link href="/produk" className="hover:text-sky-500">Produk</Link>
          {" > "}
          <span className="text-gray-500">Detail</span>
        </p>

        {/* Konten utama */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Galeri */}
          <div>
            <div className="relative h-96 overflow-hidden rounded-2xl bg-gray-100">
              <Image src={fotos[activeFoto]} alt={produk.nama} fill className="object-cover" />
            </div>

            {fotos.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => setActiveFoto((i) => Math.max(0, i - 1))}
                  disabled={activeFoto === 0}
                  className="shrink-0 rounded-full border border-gray-200 p-1 text-gray-400 hover:text-sky-500 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex gap-2 overflow-x-auto">
                  {fotos.map((foto, i) => (
                    <button
                      key={foto + i}
                      onClick={() => setActiveFoto(i)}
                      className={cn(
                        "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2",
                        activeFoto === i ? "border-sky-500" : "border-transparent"
                      )}
                    >
                      <Image src={foto} alt={`${produk.nama} ${i + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setActiveFoto((i) => Math.min(fotos.length - 1, i + 1))}
                  disabled={activeFoto === fotos.length - 1}
                  className="shrink-0 rounded-full border border-gray-200 p-1 text-gray-400 hover:text-sky-500 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Info produk */}
          <div>
            <p className="text-sm font-medium text-sky-500">{produk.jurusan}</p>
            <p className="text-xs text-gray-400">{produk.sekolah}</p>

            <h1 className="mt-2 text-2xl font-bold text-gray-900">{produk.nama}</h1>

            <p className="mt-3 text-2xl font-bold text-gray-900">{rupiah(produk.harga)}</p>

            <div className="mt-1 flex items-center gap-1">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-700">{produk.rating?.toFixed(1) ?? "0.0"}</span>
              <span className="text-sm text-gray-400">
                ({produk.jumlahReview.toLocaleString("id-ID")} Penilaian)
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-500">{produk.deskripsi}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border border-gray-200">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-gray-500 hover:text-sky-500">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(produk.stok, q + 1))} className="px-3 py-2 text-gray-500 hover:text-sky-500">
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button className="gap-2 rounded-lg bg-sky-500 px-5 hover:bg-sky-600">
                <ShoppingCart className="h-4 w-4" />
                Add to cart
              </Button>

              <button className="rounded-lg border border-gray-200 p-2.5 text-gray-400 hover:border-red-300 hover:text-red-400">
                <Heart className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-400">Stok : {produk.stok}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10">
          <div className="flex gap-2 border-b border-gray-200">
            {([
              { key: "deskripsi", label: "Deskripsi" },
              { key: "informasi", label: "Informasi Tambahan" },
              { key: "review", label: "Review" },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-t-lg px-4 py-2.5 text-sm font-medium",
                  tab === t.key ? "bg-sky-500 text-white" : "text-gray-500 hover:text-sky-500"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-b-2xl rounded-tr-2xl border border-gray-100 bg-white p-6 text-sm leading-relaxed text-gray-500">
            {tab === "deskripsi" && <p>{produk.deskripsi}</p>}
            {tab === "informasi" && (
              <ul className="space-y-1">
                <li>Jurusan: {produk.jurusan}</li>
                <li>Sekolah: {produk.sekolah}</li>
                <li>Stok Tersedia: {produk.stok}</li>
              </ul>
            )}
            {tab === "review" && (
              <p className="text-gray-400">
                {produk.jumlahReview > 0
                  ? `Terdapat ${produk.jumlahReview} review untuk produk ini.`
                  : "Belum ada review untuk produk ini."}
              </p>
            )}
          </div>
        </div>

        {/* Rekomendasi */}
        {rekomendasi.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-5 text-center text-xl font-bold text-gray-800">Rekomendasi Untuk Anda</h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {rekomendasi.map((p) => (
                <RekomendasiCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RekomendasiCard({ product }: { product: ProdukPublicItem }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md">
      <div className="relative h-40 overflow-hidden bg-gray-50">
        <Image src={product.gambar} alt={product.nama} fill className="h-full w-full object-cover" />
        <Badge className="absolute top-2 left-2 rounded-md bg-sky-400 px-2 py-0.5 text-[10px] font-semibold text-white shadow hover:bg-sky-500">
          {product.badge}
        </Badge>
        <button className="absolute top-2 right-2 rounded-full bg-white/80 p-1.5 shadow backdrop-blur-sm hover:bg-white">
          <Heart size={12} className="text-gray-400 hover:text-red-400" />
        </button>
      </div>

      <div className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xs font-bold leading-tight text-gray-900">{product.nama}</h3>
          <span className="whitespace-nowrap text-[10px] text-gray-400">{product.terjual} Terjual</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            Badge status: <span className="font-medium text-sky-500">{product.badge}</span>
          </span>
          <div className="flex items-center gap-0.5">
            <Star size={10} className="fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-semibold text-gray-700">{product.rating?.toFixed(1) ?? "0.0"}</span>
          </div>
        </div>

        <p className="text-end text-sm font-bold text-gray-900">{rupiah(product.harga)}</p>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(product.jurusan)}&background=0ea5e9&color=fff&size=32`}
              />
              <AvatarFallback className="bg-sky-100 text-[8px] text-sky-600">
                {product.jurusan.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="truncate text-[10px] font-semibold text-gray-800">{product.jurusan}</p>
          </div>

          <Link
            href={`/produk/detail?id=${product.id}`}
            className="h-auto rounded-lg border border-sky-400 px-2 py-0.5 text-[10px] font-semibold text-sky-500 hover:bg-sky-50 hover:text-sky-600 inline-flex items-center"
          >
            Lihat Produk
          </Link>
        </div>
      </div>
    </div>
  );
}