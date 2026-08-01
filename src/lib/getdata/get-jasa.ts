import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { JasaItem } from "@/types/interfaces/jasa";

export async function getJasaList(): Promise<JasaItem[]> {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        redirect("/login");
    }

    const jurusan = await prisma.jurusan.findUnique({
        where: { user_id: session.user.id },
    });
    if (!jurusan) return [];

    const jasaList = await prisma.jasa.findMany({
        where: { produk: { jurusan_id: jurusan.jurusan_id } },
        include: { produk: { include: { foto: true } } },
        orderBy: { createdAt: "desc" },
    });

    return jasaList.map((j) => ({
        jasa_id: j.jasa_id,
        produk_id: j.produk_id,
        nama_jasa: j.nama_jasa,
        deskripsi: j.produk.deskripsi,
        fotos: j.produk.foto.map((f) => f.url),
        harga: j.produk.harga,
        status: j.produk.status,
        estimasi_pengerjaan: j.estimasi_pengerjaan,
        total_project: j.total_project,
        view_count: j.produk.view_count,
    }));
}