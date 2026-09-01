import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function getStatsSuperAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SuperAdmin") {
        redirect("/auth/login");
    }

    const [totalSekolah, totalAdmin] = await Promise.all([
        prisma.sMK.count(),
        prisma.user.count({
            where: {
                role: { in: ["AdminSMK", "AdminJurusan"] },
                isActive: true,
            },
        }),
    ]);

    return { totalSekolah, totalAdmin };
}

export async function getStatsAdminSMK() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminSMK") {
        redirect("/auth/login");
    }

    const smk = await prisma.sMK.findUnique({
        where: { user_id: session.user.id },
        include: { jurusans: true },
    });

    if (!smk) {
        return { totalJurusan: 0, totalProduk: 0, totalJasa: 0 };
    }

    const jurusanIdFilter = smk.jurusans.map((j) => j.jurusan_id);

    if (jurusanIdFilter.length === 0) {
        return { totalJurusan: 0, totalProduk: 0, totalJasa: 0 };
    }

    const [totalJurusan, totalProduk, totalJasa] = await Promise.all([
        prisma.jurusan.count({
            where: { smk_id: smk.smk_id },
        }),
        prisma.produk.count({
            where: {
                jurusan_id: { in: jurusanIdFilter },
                barang: { some: {} },
            },
        }),
        prisma.jasa.count({
            where: {
                produk: { jurusan_id: { in: jurusanIdFilter } },
            },
        }),
    ]);

    return { totalJurusan, totalProduk, totalJasa };
}

export async function getStatsAdminJurusan() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        redirect("/auth/login");
    }

    const jurusan = await prisma.jurusan.findUnique({
        where: { user_id: session.user.id },
    });

    if (!jurusan) {
        return { totalProduk: 0, totalJasa: 0, totalPesanan: 0 };
    }

    const [totalProduk, totalJasa, totalPesanan] = await Promise.all([
        prisma.produk.count({
            where: {
                jurusan_id: jurusan.jurusan_id,
                barang: { some: {} },
            },
        }),
        prisma.jasa.count({
            where: { produk: { jurusan_id: jurusan.jurusan_id } },
        }),
        prisma.order_Detail.count({
            where: {
                produk: { jurusan_id: jurusan.jurusan_id },
            },
        }),
    ]);

    return { totalProduk, totalJasa, totalPesanan };
}

export interface TefaStats {
    smk: number;
    jurusan: number;
    produk: number;
    jasa: number;
}

export async function getTefaStats(): Promise<TefaStats> {
    const [smk, jurusan, produk, jasa] = await Promise.all([
        prisma.sMK.count(),
        prisma.jurusan.count(),
        prisma.barang.count(),
        prisma.jasa.count(),
    ]);

    return { smk, jurusan, produk, jasa };
}
