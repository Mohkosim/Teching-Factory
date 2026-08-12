"use client";

import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GaleriItem } from "@/types/interfaces/galeri";

interface GaleriDetailDialogProps {
  galeri: GaleriItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GaleriDetailDialog({
  galeri,
  open,
  onOpenChange,
}: GaleriDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden rounded-2xl p-0">
        <div className="bg-sky-50 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Detail Galeri</h2>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-xl">
            <Image
              src={galeri.image}
              alt={galeri.judul}
              fill
              className="object-cover"
            />
          </div>

          <div className="flex flex-col justify-center">
            <h3 className="text-base font-bold text-gray-900">
              {galeri.judul}
            </h3>
            <p className="mt-1.5 text-sm text-gray-500">
              {galeri.deskripsi || "Tidak ada deskripsi"}
            </p>
            {galeri.user && (
              <p className="mt-3 text-sm text-gray-700">
                <span className="text-gray-500">By :</span>{" "}
                {galeri.user.name}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}