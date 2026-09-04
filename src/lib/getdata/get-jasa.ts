import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { JasaItem } from "@/types/interfaces/jasa";

export async function getJasaList(): Promise<JasaItem[]> {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminJurusan", "AdminSMK"].includes(session.user.role)) {
        redirect("/auth/login");
    }

    let jurusanIdFilter: string[] = [];

    if (session.user.role === "AdminJurusan") {
        const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
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

    const jasaList = await prisma.jasa.findMany({
        where: { produk: { jurusan_id: { in: jurusanIdFilter } } },
        include: {
            produk: {
                include: {
                    foto: true,
                    jurusan: { include: { smk: true } }, 
                },
            },
            portofolio: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return jasaList.map((j) => ({
        jasa_id: j.jasa_id,
        produk_id: j.produk_id,
        nama_jasa: j.nama_jasa,
        deskripsi: j.produk.deskripsi,
        fotos: j.produk.foto.map((f) => f.url),
        portofolio: j.portofolio.map((p) => ({
            portofolio_id: p.portofolio_id,
            file_path: p.file_path,
            deskripsi: p.deskripsi,
        })),
        harga: j.produk.harga,
        status: j.produk.status,
        estimasi_pengerjaan: j.estimasi_pengerjaan,
        total_project: j.total_project,
        view_count: j.produk.view_count,

        nama_jurusan: j.produk.jurusan.nama_jurusan,
        status_publikasi: j.produk.status_publikasi,
        catatan_revisi: j.produk.catatan_revisi,

  
        jurusan_id: j.produk.jurusan_id,
        jurusan_smk_id: j.produk.jurusan.smk_id,
        jurusan_smk_nama: j.produk.jurusan.smk?.kota ?? "",
    }));
}