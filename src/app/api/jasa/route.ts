import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jasaSchema } from "@/lib/validations/jasa";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan) {
        return NextResponse.json({ message: "Data jurusan tidak ditemukan" }, { status: 404 });
    }

    const jasaList = await prisma.jasa.findMany({
        where: { produk: { jurusan_id: jurusan.jurusan_id } },
        include: { produk: { include: { foto: true } } },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jasaList);
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = jasaSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
    }

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan) {
        return NextResponse.json({ message: "Data jurusan tidak ditemukan" }, { status: 404 });
    }

    const {
        nama_jasa, deskripsi, harga, status,
        estimasi_pengerjaan, total_project, fotos,
    } = parsed.data;

    try {
        // Jasa adalah "detail" dari Produk, jadi buat Produk dulu sebagai induknya
        const produk = await prisma.produk.create({
            data: {
                jurusan_id: jurusan.jurusan_id,
                nama_produk: nama_jasa,
                deskripsi,
                harga,
                status,
                foto: {
                    create: fotos.map((url) => ({ url })),
                },
                jasa: {
                    create: {
                        nama_jasa,
                        estimasi_pengerjaan,
                        total_project,
                    },
                },
            },
            include: { jasa: true, foto: true },
        });

        return NextResponse.json({ message: "Jasa berhasil ditambahkan", data: produk });
    } catch (error) {
        console.error("POST /api/jasa error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}