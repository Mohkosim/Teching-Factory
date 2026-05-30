"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const kontakData = [
  {
    id: 1,
    tanggal: "12-08-2025",
    email: "Johnefendi@gmail.com",
    nomor: "08231238261123",
    pesan: "Forem ipsum dolor ...",
  },
  {
    id: 2,
    tanggal: "12-08-2025",
    email: "Johnefendi@gmail.com",
    nomor: "08231238261123",
    pesan: "Forem ipsum dolor ...",
  },
  {
    id: 3,
    tanggal: "12-08-2025",
    email: "Johnefendi@gmail.com",
    nomor: "08231238261123",
    pesan: "Forem ipsum dolor ...",
  },
  {
    id: 4,
    tanggal: "12-08-2025",
    email: "Johnefendi@gmail.com",
    nomor: "08231238261123",
    pesan: "Forem ipsum dolor ...",
  },
  {
    id: 5,
    tanggal: "12-08-2025",
    email: "Johnefendi@gmail.com",
    nomor: "08231238261123",
    pesan: "Forem ipsum dolor ...",
  },
  {
    id: 6,
    tanggal: "12-08-2025",
    email: "Johnefendi@gmail.com",
    nomor: "08231238261123",
    pesan: "Forem ipsum dolor ...",
  },
  {
    id: 7,
    tanggal: "12-08-2025",
    email: "Johnefendi@gmail.com",
    nomor: "08231238261123",
    pesan: "Forem ipsum dolor ...",
  },
];

export function ContactsInTable() {
  return (
    <Card className="border-0  shadow-sm bg-white">
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
      <CardContent className="px-8 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
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
              {kontakData.slice(0,4).map((kontak) => (
                <tr
                  key={kontak.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 pr-4 text-foreground whitespace-nowrap">
                    {kontak.tanggal}
                  </td>
                  <td className="py-3 pr-4 text-foreground whitespace-nowrap">
                    {kontak.email}
                  </td>
                  <td className="py-3 pr-4 text-foreground whitespace-nowrap">
                    {kontak.nomor}
                  </td>
                  <td className="py-3 text-foreground">
                    {kontak.pesan}{" "}
                    <Link
                      href={`/dashboard/kontak-masuk/${kontak.id}`}
                      className="text-primary font-medium hover:underline"
                    >
                      Read more
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end border-t pt-5">
          <Link
            href="/dashboard/kontak-masuk"
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            Lihat Selengkapnya
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}