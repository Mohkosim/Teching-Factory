"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import { Star, Heart, ShoppingCart, MessageCircle, Minus, Plus, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
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
import { buildWhatsappLink } from "@/lib/utils/whatsapp";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatRupiah } from "@/lib/utils/format";
import GaleriGambarModal from "@/components/galeri-gambar-modal";
import type { VarianGrupPublik, VarianKombinasiPublik } from "@/types/interfaces/varian";


export default function ProdukDetailClient({
  produk,
  rekomendasi,
  initialFavorited,
  favoritIds,
  varianGrup,
  varianKombinasi,
}: {
  produk: ProdukPublicItem;
  rekomendasi: ProdukPublicItem[];
  initialFavorited: boolean;
  favoritIds: FavoritIds;
  varianGrup: VarianGrupPublik[];
  varianKombinasi: VarianKombinasiPublik[];
}) {
  const [activeFoto, setActiveFoto] = useState(0);
  const [galeriOpen, setGaleriOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"deskripsi" | "informasi" | "review">("deskripsi");
  const [addingToCart, setAddingToCart] = useState(false);
  const [favorited, setFavorited] = useState(initialFavorited)
  const [togglingFavorit, setTogglingFavorit] = useState(false);
  const [selectedOpsi, setSelectedOpsi] = useState<Record<string, string>>({});

  const fotos = produk.fotos.length > 0 ? produk.fotos : [produk.gambar];

  const rekomendasiTersaring = useMemo(() => {
    return rekomendasi.filter((p) => p.stok > 0);
  }, [rekomendasi]);

  const pilihOpsi = (grupId: string, opsiId: string) => {
    setSelectedOpsi((prev) => ({ ...prev, [grupId]: opsiId }));
  };

  const punyaVarian = varianGrup.length > 0;
  const semuaVarianTerpilih = !punyaVarian || varianGrup.every((g) => !!selectedOpsi[g.grup_id]);

  const kombinasiTerpilih = useMemo(() => {
    if (!punyaVarian || !semuaVarianTerpilih) return null;
    const targetIds = Object.values(selectedOpsi);
    return (
      varianKombinasi.find(
        (k) => k.opsiIds.length === targetIds.length && targetIds.every((id) => k.opsiIds.includes(id))
      ) ?? null
    );
  }, [selectedOpsi, punyaVarian, semuaVarianTerpilih, varianKombinasi]);

  const hargaTampil = kombinasiTerpilih?.harga ?? produk.harga;
  const stokTampil = punyaVarian ? (kombinasiTerpilih?.stok ?? 0) : produk.stok;

  const handleAddToCart = async () => {
    if (punyaVarian && !kombinasiTerpilih) {
      toast.error("Pilih semua varian terlebih dahulu");
      return;
    }
    setAddingToCart(true);
    tampilkanLoading("Menambahkan ke keranjang...");
    try {
      const res = await tambahKeKeranjang(produk.id, qty, kombinasiTerpilih?.kombinasi_id ?? null);
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

  const handleChatPenjual = () => {
    if (!produk.noWhatsapp) {
      toast.error("Nomor WhatsApp penjual tidak tersedia");
      return;
    }
    const pesan = `Halo, saya tertarik dengan produk "${produk.nama}" di TEFA. Apakah masih tersedia?`;
    window.open(buildWhatsappLink(produk.noWhatsapp, pesan), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="hover:text-sky-500">Toko</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/produk" className="hover:text-sky-500">Produk</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-500">Detail</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Konten utama */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Galeri */}
          <div>
            <button
              type="button"
              onClick={() => setGaleriOpen(true)}
              className="group relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-gray-100"
            >
              <Image src={fotos[activeFoto]} alt={produk.nama} fill className="object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <Maximize2 className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>

            {fotos.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setActiveFoto((i) => Math.max(0, i - 1))}
                  disabled={activeFoto === 0}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex flex-1 justify-center gap-2 overflow-x-auto">
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

            <p className="text-xl font-bold text-gray-900">{formatRupiah(hargaTampil)}</p>

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

            <div className="space-y-3 pt-2">
              {punyaVarian && (
                <div className="space-y-4">
                  {varianGrup.map((grup) => (
                    <div key={grup.grup_id}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">{grup.nama}</p>
                      <div className="flex flex-wrap gap-2">
                        {grup.opsi.map((opsi) => {
                          const aktif = selectedOpsi[grup.grup_id] === opsi.opsi_id;
                          const previewGambar = varianKombinasi.find((k) => k.opsiIds.includes(opsi.opsi_id))?.gambar;
                          return (
                            <button
                              key={opsi.opsi_id}
                              type="button"
                              onClick={() => pilihOpsi(grup.grup_id, opsi.opsi_id)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                                aktif
                                  ? "border-sky-500 bg-sky-50 font-medium text-sky-600"
                                  : "border-gray-200 text-gray-600 hover:border-sky-300"
                              )}
                            >
                              {previewGambar && (
                                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md">
                                  <Image src={previewGambar} alt={opsi.nama} fill className="object-cover" />
                                </span>
                              )}
                              {opsi.nama}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {!kombinasiTerpilih && (
                    <p className="text-xs text-amber-600">Pilih semua varian dulu</p>
                  )}
                </div>
              )}

              <div className="flex w-fit items-center rounded-full border border-gray-300">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-gray-500 hover:text-sky-500">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(stokTampil || 1, q + 1))} className="px-3 py-2 text-gray-500 hover:text-sky-500">
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="gap-2 rounded-full bg-sky-500 px-6 hover:bg-sky-600"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to cart
                </Button>

                <Button
                  onClick={handleChatPenjual}
                  variant="outline"
                  className="gap-2 rounded-full border-green-500 text-green-600 hover:bg-green-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat Penjual
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

      <GaleriGambarModal
        open={galeriOpen}
        onClose={() => setGaleriOpen(false)}
        images={fotos}
        activeIndex={activeFoto}
        onSelect={setActiveFoto}
        title={produk.nama}
      />
    </div>
  );
}