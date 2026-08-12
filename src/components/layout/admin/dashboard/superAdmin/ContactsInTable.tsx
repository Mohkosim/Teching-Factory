"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPesanList, updatePesanById } from "@/lib/api/kontak";
import { PesanApi } from "@/types/interfaces/kontak";

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ContactsInTable() {
  const [data, setData] = useState<PesanApi[]>([]);
  const [viewItem, setViewItem] = useState<PesanApi | null>(null);

  useEffect(() => {
    getPesanList({ limit: 20, excludeDeleted: true })
      .then(setData)
      .catch(() => setData([]));
  }, []);

  async function handleReadMore(kontak: PesanApi) {
    setViewItem(kontak);

    if (!kontak.isRead) {
      // Update tampilan lokal biar langsung kelihatan terbaca
      setData((prev) =>
        prev.map((k) => (k.pesan_id === kontak.pesan_id ? { ...k, isRead: true } : k))
      );
      try {
        await updatePesanById(kontak.pesan_id, { isRead: true });
      } catch {
        // silent, non-critical
      }
    }
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="px-8 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Kontak Masuk
          </h3>
          <Select defaultValue="semua">
            <SelectTrigger className="w-1xl h-8 text-xs bg-white border-2 rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              <SelectItem value="baru">Baru</SelectItem>
              <SelectItem value="lama">Lama</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-8">
        <div className="max-h-64 overflow-y-auto overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-muted-foreground whitespace-nowrap">
                  Tanggal
                </th>
                <th className="text-left py-2.5 pr-4 font-semibold text-muted-foreground whitespace-nowrap">
                  E-mail
                </th>
                <th className="text-left py-2.5 pr-4 font-semibold text-muted-foreground whitespace-nowrap">
                  Nomor Hp
                </th>
                <th className="text-left py-2.5 font-semibold text-muted-foreground">
                  Pesan
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    Belum ada pesan masuk
                  </td>
                </tr>
              ) : (
                data.map((kontak) => (
                  <tr
                    key={kontak.pesan_id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 pr-4 text-foreground whitespace-nowrap">
                      {formatTanggal(kontak.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-foreground whitespace-nowrap">
                      {kontak.email}
                    </td>
                    <td className="py-3 pr-4 text-foreground whitespace-nowrap">
                      {kontak.phone}
                    </td>
                    <td className="py-3 text-foreground">
                      {kontak.pesan.length > 30 ? `${kontak.pesan.slice(0, 30)}...` : kontak.pesan}{" "}
                      <button
                        onClick={() => handleReadMore(kontak)}
                        className="text-primary font-medium hover:underline"
                      >
                        Read more
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pesan</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                  {viewItem.nama.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{viewItem.nama}</p>
                  <p className="text-xs text-gray-500">{viewItem.phone}</p>
                  <p className="text-xs text-gray-500">{viewItem.email}</p>
                </div>
                <p className="ml-auto text-xs text-gray-400">
                  {formatTanggal(viewItem.createdAt)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{viewItem.pesan}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}