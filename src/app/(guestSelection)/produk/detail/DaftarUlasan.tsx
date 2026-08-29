"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewPublicItem } from "@/lib/data/produk-public";

type Urutan = "membantu" | "terbaru" | "tertinggi" | "terendah";

const OPSI_URUTAN: { value: Urutan; label: string }[] = [
  { value: "membantu", label: "Paling Membantu" },
  { value: "terbaru", label: "Terbaru" },
  { value: "tertinggi", label: "Rating Tertinggi" },
  { value: "terendah", label: "Rating Terendah" },
];

function skorMembantu(r: ReviewPublicItem): number {
  const skorFoto = r.fotos.length > 0 ? 2 : 0;
  const skorKomentar = Math.min(r.komentar.trim().length / 50, 2); // maks +2
  return skorFoto + skorKomentar;
}

function urutkanReviews(reviews: ReviewPublicItem[], urutan: Urutan): ReviewPublicItem[] {
  const list = [...reviews];

  switch (urutan) {
    case "terbaru":
      return list.sort(
        (a, b) => new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime()
      );

    case "tertinggi":
      return list.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime();
      });

    case "terendah":
      return list.sort((a, b) => {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime();
      });

    case "membantu":
    default:
      return list.sort((a, b) => {
        const diffSkor = skorMembantu(b) - skorMembantu(a);
        if (diffSkor !== 0) return diffSkor;
        return new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime();
      });
  }
}

export default function DaftarUlasan({
  reviews,
  jumlahReview,
}: {
  reviews: ReviewPublicItem[];
  jumlahReview: number;
}) {
  const [urutan, setUrutan] = useState<Urutan>("membantu");

  const reviewsTerurut = useMemo(() => urutkanReviews(reviews, urutan), [reviews, urutan]);

  if (reviews.length === 0) {
    return (
      <Card className="rounded-2xl border-gray-100">
        <CardContent className="px-6 text-center">
          <p className="text-sm text-gray-400">Belum ada ulasan untuk produk ini.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-gray-100">
      <CardContent className="px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold tracking-wide text-gray-800">ULASAN PILIHAN</h3>
            <p className="text-xs text-gray-400">
              Menampilkan {reviewsTerurut.length} dari {jumlahReview} ulasan
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Urutkan</span>
            <Select value={urutan} onValueChange={(v) => setUrutan(v as Urutan)}>
              <SelectTrigger className="h-8 w-40 rounded-full border-sky-500 text-sky-600 focus:ring-sky-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPSI_URUTAN.map((opsi) => (
                  <SelectItem key={opsi.value} value={opsi.value}>
                    {opsi.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          {reviewsTerurut.map((r, idx) => (
            <div key={r.id}>
              {idx > 0 && <Separator className="bg-gray-100" />}
              <div className="py-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}
                    />
                  ))}
                  <span className="ml-2 text-xs text-gray-400">{r.waktu}</span>
                </div>

                <p className="mt-2 text-sm font-semibold text-gray-700">{r.namaSamaran}</p>

                {r.komentar && (
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{r.komentar}</p>
                )}

                {r.fotos.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {r.fotos.map((foto, i) => (
                      <div
                        key={foto + i}
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
                      >
                        <Image src={foto} alt={`Foto ulasan ${i + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}