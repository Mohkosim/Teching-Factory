"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const data = [
  { bulan: "Jun '24", nilai: 95 },
  { bulan: "Jul '24", nilai: 80 },
  { bulan: "Ags '24", nilai: 70 },
  { bulan: "Sep '24", nilai: 120 },
  { bulan: "Okt '24", nilai: 185 },
  { bulan: "Nov '24", nilai: 160 },
  { bulan: "Des '24", nilai: 150 },
  { bulan: "Jan '25", nilai: 110 },
];

export function StatisticsChart() {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="px-8 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Statistic SMK Terdaftar
          </h3>
          <Select defaultValue="semua">
            <SelectTrigger className="w-1xl h-8 text-xs bg-white border-2 rounded-md ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              <SelectItem value="produk">Produk</SelectItem>
              <SelectItem value="jasa">Jasa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="hsl(214, 32%, 88%)"
              vertical={false}
            />
            <XAxis
              dataKey="bulan"
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 55%)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 55%)" }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 50, 100, 150, 200]}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid hsl(214, 32%, 88%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="nilai"
              stroke="hsl(207, 90%, 40%)"
              strokeWidth={2.5}
              dot={{ fill: "hsl(207, 90%, 40%)", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-3 flex justify-end border-t pt-5">
          <Link
            href="/dashboard/statistik"
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