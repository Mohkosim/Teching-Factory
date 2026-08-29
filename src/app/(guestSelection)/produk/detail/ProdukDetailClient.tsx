"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import { Star, Heart, ShoppingCart, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProdukCard from "@/components/produkcard";
import RingkasanRating from "./RingkasanRating";
import DaftarUlasan from "./DaftarUlasan";
import DeskripsiFormatted from "./DeskripsiFormatted";
import { cn } from "@/lib/utils";
import { tambahKeKeranjang } from "@/lib/api/keranjang";
import { toggleFavoritProduk } from "@/lib/api/favorit";
import type { ProdukPublicItem } from "@/lib/data/produk-public";
import type { FavoritIds } from "@/lib/data/favorit-public";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function ProdukDetailClient({
  produk,
  rekomendasi,
  initialFavorited,
  favoritIds,
}: {
  produk: ProdukPublicItem;
  rekomendasi: ProdukPublicItem[];
  initialFavorited: boolean;
  favoritIds: FavoritIds;
}) {
  const [activeFoto, setActiveFoto] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"deskripsi" | "informasi" | "review">("deskripsi");
  const [addingToCart, setAddingToCart] = useState(false);
  const [favorited, setFavorited] = useState(initialFavorited)
  const [togglingFavorit, setTogglingFavorit] = useState(false);

  const fotos = produk.fotos.length > 0 ? produk.fotos : [produk.gambar];

  // Produk stok habis didorong ke belakang, urutan lain (sold_count) tetap
  // terjaga di dalam masing-masing grup karena sort JS stabil.
  const rekomendasiTersaring = useMemo(() => {
    return [...rekomendasi].sort((a, b) => {
      const aHabis = a.stok <= 0 ? 1 : 0;
      const bHabis = b.stok <= 0 ? 1 : 0;
      return aHabis - bHabis;
    });
  }, [rekomendasi]);

  const handleAddToCart = async () => {
    setAddingToCart(true);
    tampilkanLoading("Menambahkan ke keranjang...");
    try {
      const res = await tambahKeKeranjang(produk.id, qty);
      Swal.close();
      if (res.ok) {
        toast.success(`${produk.nama} ditambahkan ke keranjang`);
      } else {
        toast.error(res.status === 401 ? "Silakan login untuk menambah ke keranjang" : "Gagal menambahkan ke keranjang");
      }
    } catch {
      Swal.close();
      toast.error("Gagal menambahkan ke keranjang");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleFavorit = async () => {
    if (togglingFavorit) return;

    const nextFavorited = !favorited;
    setFavorited(nextFavorited);
    setTogglingFavorit(true);
    tampilkanLoading(nextFavorited ? "Menambahkan ke favorit..." : "Menghapus dari favorit...");

    try {
      const res = await toggleFavoritProduk(produk.id);
      Swal.close();
      if (!res.ok) {
        setFavorited(!nextFavorited);
        toast.error(res.status === 401 ? "Silakan login untuk menambah favorit" : "Gagal memperbarui favorit");
        return;
      }
      toast.success(nextFavorited ? "Ditambahkan ke favorit" : "Dihapus dari favorit");
    } catch {
      setFavorited(!nextFavorited);
      Swal.close();
      toast.error("Gagal memperbarui favorit");
    } finally {
      setTogglingFavorit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-sky-500">Toko</Link>
          <span className="mx-1.5">›</span>
          <Link href="/produk" className="hover:text-sky-500">Produk</Link>
          <span className="mx-1.5">›</span>
          <span className="text-gray-500">Detail</span>
        </nav>

        {/* Konten utama */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Galeri */}
          <div>
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-gray-100">
              <Image src={fotos[activeFoto]} alt={produk.nama} fill className="object-cover" />
            </div>

            {fotos.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setActiveFoto((i) => Math.max(0, i - 1))}
                  disabled={activeFoto === 0}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex flex-1 gap-2 overflow-x-auto">
                  {fotos.map((foto, i) => (
                    <button
                      key={foto + i}
                      onClick={() => setActiveFoto(i)}
                      className={cn(
                        "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2",
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Info produk */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-500">{produk.jurusan}</p>
            <p className="text-sm font-bold text-gray-700">{produk.sekolah}</p>

            <h1 className="text-2xl font-bold uppercase text-gray-900 sm:text-3xl">{produk.nama}</h1>

            <p className="text-xl font-bold text-gray-900">{rupiah(produk.harga)}</p>

            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-700">{produk.rating?.toFixed(1) ?? "0.0"}</span>
              <span className="text-xs text-gray-400">
                ({produk.jumlahReview.toLocaleString("id-ID")} Rating)
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Stok : {produk.stok}</span>
              <span className="text-gray-300">•</span>
              <span>{produk.terjual.toLocaleString("id-ID")} Terjual</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center rounded-full border border-gray-300">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-gray-500 hover:text-sky-500">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(produk.stok, q + 1))} className="px-3 py-2 text-gray-500 hover:text-sky-500">
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="gap-2 rounded-full bg-sky-500 px-6 hover:bg-sky-600"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to cart
              </Button>

              <button
                onClick={handleToggleFavorit}
                disabled={togglingFavorit}
                aria-pressed={favorited}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
                  favorited
                    ? "border-red-300 bg-red-50 text-red-500"
                    : "border-gray-300 text-gray-400 hover:border-red-300 hover:text-red-400"
                )}
              >
                <Heart className={cn("h-4 w-4", favorited && "fill-red-500")} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10">
          <div className="flex gap-2">
            {([
              { key: "deskripsi", label: "Deskripsi" },
              { key: "informasi", label: "Informasi Tambahan" },
              { key: "review", label: "Review" },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                  tab === t.key
                    ? "bg-sky-500 text-white"
                    : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            {tab === "deskripsi" && <DeskripsiFormatted teks={produk.deskripsi} />}
            {tab === "informasi" && (
              <ul className="space-y-1 text-sm leading-relaxed text-gray-500">
                <li>Jurusan: {produk.jurusan}</li>
                <li>Sekolah: {produk.sekolah}</li>
                <li>Stok Tersedia: {produk.stok}</li>
                <li>Kondisi: {produk.kondisi}</li>
              </ul>
            )}
            {tab === "review" && (
              <div className="space-y-6">
                <RingkasanRating
                  rating={produk.rating}
                  jumlahReview={produk.jumlahReview}
                  persentasePuas={produk.persentasePuas ?? 0}
                  breakdown={produk.ratingBreakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }}
                />
                <DaftarUlasan reviews={produk.reviews ?? []} jumlahReview={produk.jumlahReview} />
              </div>
            )}
          </div>
        </div>

        {/* Rekomendasi */}
        {rekomendasiTersaring.length > 0 && (
          <div className="mt-14">
            <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">
              Rekomendasi Untuk Anda
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {rekomendasiTersaring.map((p) => (
                <ProdukCard
                  key={p.id}
                  product={p}
                  initialFavorited={favoritIds.produkIds.includes(p.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}