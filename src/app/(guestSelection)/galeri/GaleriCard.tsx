"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GaleriItem } from "@/types/interfaces/galeri";
import GaleriDetailDialog from "./GaleriDetailDialog";

export default function GaleriCard({ galeri }: { galeri: GaleriItem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className="group cursor-pointer overflow-hidden rounded-xl border-0 p-0 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
      >
        <CardContent className="relative aspect-square p-0">
          <Image
            src={galeri.image}
            alt={galeri.judul}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/70 via-black/10 to-transparent p-3">
            <Badge className="mb-1.5 w-fit bg-white/90 text-blue-700 hover:bg-white/90">
              {galeri.kategori}
            </Badge>
            <p className="line-clamp-2 text-sm font-semibold text-white">
              {galeri.judul}
            </p>
          </div>
        </CardContent>
      </Card>

      <GaleriDetailDialog galeri={galeri} open={open} onOpenChange={setOpen} />
    </>
  );
}