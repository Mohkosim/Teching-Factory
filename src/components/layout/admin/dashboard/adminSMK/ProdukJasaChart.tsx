"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const data = [
    { name: "Produk", value: 54, color: "#ef4444" },
    { name: "Lainnya", value: 16, color: "#94a3b8" },
    { name: "Jasa", value: 30, color: "#22d3ee" },
];

const RADIAN = Math.PI / 180;

interface PieLabelProps {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    index?: number;
}

function renderLabel({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, index = 0 }: PieLabelProps) {
    const item = data[index];
    if (!item || item.name === "Lainnya") return null;

    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <g>
            <circle cx={x} cy={y} r={18} fill="white" stroke="#e5e7eb" strokeWidth={1} />
            <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={600}
                fill="#111827"
            >
                {item.value}%
            </text>
        </g>
    );
}

export function ProdukJasaChart() {
    return (
        <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-8 border-b">
                <h3 className="text-sm font-bold text-foreground text-center">
                    Produk dan Jasa
                </h3>
            </CardHeader>
            <CardContent className="px-8 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            innerRadius={60}
                            outerRadius={90}
                            startAngle={90}
                            endAngle={-270}
                            label={renderLabel}
                            labelLine={false}
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                        <span className="text-xs text-muted-foreground">Produk</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee]" />
                        <span className="text-xs text-muted-foreground">Jasa</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}