"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ChartDataPoint {
  bulan: string;
  nilai: number;
}

interface StatisticsChartProps {
  data: {
    semua: ChartDataPoint[];
    produk: ChartDataPoint[];
    jasa: ChartDataPoint[];
  };
}

const FALLBACK_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function StatisticsChart({ data }: StatisticsChartProps) {
  const [filter] = useState<"semua">("semua");

  const rawData = data[filter];

  const chartData: ChartDataPoint[] =
    rawData.length > 0
      ? rawData
      : FALLBACK_BULAN.map((bulan) => ({ bulan, nilai: 0 }));

  const rawMax = Math.max(...chartData.map((d) => d.nilai));
  const maxNilai = rawMax > 0 ? rawMax : 10;


  const step = Math.ceil(maxNilai / 4) || 1;
  const yTicks = Array.from(new Set([0, step, step * 2, step * 3, step * 4]));

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="px-8 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Statistic SMK Terdaftar
          </h3>
        </div>
      </CardHeader>
      <CardContent className="px-8">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSmkTerdaftar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(207, 90%, 40%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(207, 90%, 40%)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={[0, step * 4]}
              ticks={yTicks}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid hsl(214, 32%, 88%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="natural"
              dataKey="nilai"
              stroke="hsl(207, 90%, 40%)"
              strokeWidth={2.5}
              fill="url(#colorSmkTerdaftar)"
              dot={false}
              activeDot={{ r: 6, fill: "hsl(207, 90%, 40%)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}