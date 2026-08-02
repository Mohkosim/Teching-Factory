import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const BULAN_LABEL = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
];

function getMonthRange(monthsBack: number) {
    const now = new Date();
    const months: { year: number; month: number; label: string }[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            year: d.getFullYear(),
            month: d.getMonth(),
            label: `${BULAN_LABEL[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
        });
    }
    return months;
}

function countPerMonth(dates: Date[], months: { year: number; month: number; label: string }[]) {
    return months.map(({ year, month, label }) => {
        const nilai = dates.filter(
            (d) => d.getFullYear() === year && d.getMonth() === month
        ).length;
        return { bulan: label, nilai };
    });
}

export async function getStatsChart(monthsBack = 8) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SuperAdmin") {
        redirect("/auth/login");
    }

    const months = getMonthRange(monthsBack);
    const earliest = new Date(months[0].year, months[0].month, 1);

    const [smkList, produkList, jasaList] = await Promise.all([
        prisma.sMK.findMany({
            where: { createdAt: { gte: earliest } },
            select: { createdAt: true },
        }),
        prisma.produk.findMany({
            where: {
                createdAt: { gte: earliest },
                barang: { some: {} },
            },
            select: { createdAt: true },
        }),
        prisma.jasa.findMany({
            where: { createdAt: { gte: earliest } },
            select: { createdAt: true },
        }),
    ]);

    return {
        semua: countPerMonth(smkList.map((s) => s.createdAt), months),
        produk: countPerMonth(produkList.map((p) => p.createdAt), months),
        jasa: countPerMonth(jasaList.map((j) => j.createdAt), months),
    };
}