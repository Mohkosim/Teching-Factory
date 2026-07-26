"use client";

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
    { bulan: "Jun '24", nilai: 90 },
    { bulan: "Jul '24", nilai: 68 },
    { bulan: "Ags '24", nilai: 78 },
    { bulan: "Sep '24", nilai: 190 },
    { bulan: "Okt '24", nilai: 148 },
    { bulan: "Nov '24", nilai: 168 },
    { bulan: "Des '24", nilai: 120 },
];

export function ProdukChart() {
    return (
        <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-8 border-b">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Produk</h3>
                    <Select defaultValue="semua">
                        <SelectTrigger className="w-fit h-8 text-xs bg-white border-2 rounded-md gap-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="px-8">
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
                            tickLine={false} ticks={[0, 50, 100, 150, 200]}
                        />
                        <Tooltip
                            contentStyle={{ background: "white", border: "1px solid hsl(214, 32%, 88%)", borderRadius: "8px", fontSize: "12px" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="nilai"
                            stroke="hsl(207, 90%, 40%)"
                            strokeWidth={2.5} dot={{ fill: "hsl(207, 90%, 40%)", r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}