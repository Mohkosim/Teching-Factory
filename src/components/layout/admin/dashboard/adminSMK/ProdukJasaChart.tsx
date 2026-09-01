"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Slice = { name: string; value: number; color: string };

const RADIAN = Math.PI / 180;
const EMPTY_COLOR = "#e5e7eb";

function renderLabel(data: Slice[]) {
  return function Label({
    cx = 0, cy = 0, midAngle = 0, outerRadius = 0, index = 0,
  }: { cx?: number; cy?: number; midAngle?: number; outerRadius?: number; index?: number }) {
    const item = data[index];
    if (!item) return null;

    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <g>
        <circle cx={x} cy={y} r={18} fill="white" stroke="#e5e7eb" strokeWidth={1} />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill="#111827">
          {item.value}%
        </text>
      </g>
    );
  };
}

export function ProdukJasaChart({ data }: { data: Slice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const isEmpty = total === 0;

  const chartData: Slice[] = isEmpty
    ? [{ name: "Kosong", value: 1, color: EMPTY_COLOR }]
    : data;

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="px-8 border-b">
        <h3 className="text-sm font-bold text-foreground text-center">Produk dan Jasa</h3>
      </CardHeader>
      <CardContent className="px-8 flex flex-col items-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={60}
              outerRadius={90}
              startAngle={90}
              endAngle={-270}
              label={isEmpty ? false : renderLabel(data)}
              labelLine={false}
              stroke="none"
              isAnimationActive={!isEmpty}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-6">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-muted-foreground">{d.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}