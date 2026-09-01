"use client";

import { useMemo, useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ChartDataPoint {
    bulan: string;
    nilai: number;
}

interface PendapatanChartProps {
    data: {
        semua: ChartDataPoint[];
        produk: ChartDataPoint[];
        jasa: ChartDataPoint[];
    };
}

type Filter = "semua" | "produk" | "jasa";

function formatRupiahSingkat(value: number) {
    if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
    if (value >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`;
    return `Rp${value}`;
}

export function PendapatanChart({ data }: PendapatanChartProps) {
    const [filter, setFilter] = useState<Filter>("semua");
    const chartData = useMemo(() => data[filter], [data, filter]);

    return (
        <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-8 border-b">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Pendapatan</h3>
                    <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                        <SelectTrigger className="w-fit h-8 text-xs bg-white border-2 rounded-md gap-2">
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
            <CardContent className="px-8">
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPesanan" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(207, 90%, 40%)" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="hsl(207, 90%, 40%)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="hsl(214, 32%, 90%)" vertical={false} />
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
                            tickFormatter={formatRupiahSingkat}
                            width={55}
                        />
                        <Tooltip
                            contentStyle={{
                                background: "white",
                                border: "1px solid hsl(214, 32%, 88%)",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                            formatter={(value) => [`Rp ${Number(value).toLocaleString("id-ID")}`, "Pendapatan"]}
                        />
                        <Area
                            type="natural"
                            dataKey="nilai"
                            stroke="hsl(207, 90%, 40%)"
                            strokeWidth={2.5}
                            fill="url(#colorPesanan)"
                            dot={false}
                            activeDot={{ r: 6, fill: "hsl(207, 90%, 40%)", strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}