"use client";

import { useState } from "react";
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

export function StatisticsChart({ data }: StatisticsChartProps) {
  const [filter] = useState<"semua">("semua");

  const chartData = data[filter];
  const rawMax = Math.max(...chartData.map((d) => d.nilai));
  const maxNilai = rawMax > 0 ? rawMax : 10;

  // Bulatkan step ke atas biar tick-nya rapi & unik
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
          <LineChart
            data={chartData}
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
      </CardContent>
    </Card>
  );
}