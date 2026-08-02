import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { ProdukItem } from "@/types/interfaces/produk";

export async function getProdukList(): Promise<ProdukItem[]> {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminJurusan", "AdminSMK"].includes(session.user.role)) {
        redirect("/auth/login");
    }

    let jurusanIdFilter: string[] = [];

    if (session.user.role === "AdminJurusan") {
        const jurusan = await prisma.jurusan.findUnique({
            where: { user_id: session.user.id },
        });
        if (!jurusan) return [];
        jurusanIdFilter = [jurusan.jurusan_id];
    } else {
        const smk = await prisma.sMK.findUnique({
            where: { user_id: session.user.id },
            include: { jurusans: true },
        });
        if (!smk) return [];
        jurusanIdFilter = smk.jurusans.map((j) => j.jurusan_id);
    }

    if (jurusanIdFilter.length === 0) return [];

    const produkList = await prisma.produk.findMany({
        where: {
            jurusan_id: { in: jurusanIdFilter },
            barang: { some: {} },
        },
        include: { barang: true, foto: true, jurusan: true },
        orderBy: { createdAt: "desc" },
    });

    return produkList.map((p) => ({
        produk_id: p.produk_id,
        jurusan_id: p.jurusan_id,
        nama_produk: p.nama_produk,
        deskripsi: p.deskripsi,
        fotos: p.foto.map((f) => f.url),
        harga: p.harga,
        status: p.status,
        view_count: p.view_count,
        sold_count: p.sold_count,
        stok: p.barang.reduce((sum, b) => sum + b.stok, 0),
        kondisi: p.barang[0]?.kondisi ?? null,

        nama_jurusan: p.jurusan.nama_jurusan,
        status_publikasi: p.status_publikasi,
        catatan_revisi: p.catatan_revisi,
    }));
}