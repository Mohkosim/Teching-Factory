import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { produkSchema } from "@/lib/validations/produk";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan) {
        return NextResponse.json({ message: "Data jurusan tidak ditemukan" }, { status: 404 });
    }

    const produkList = await prisma.produk.findMany({
        where: { jurusan_id: jurusan.jurusan_id },
        include: { barang: true, foto: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(produkList);
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = produkSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
    }

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan) {
        return NextResponse.json({ message: "Data jurusan tidak ditemukan" }, { status: 404 });
    }

    const { nama_produk, deskripsi, harga, status, fotos, stok, kondisi } = parsed.data;

    try {
        const produk = await prisma.produk.create({
            data: {
                jurusan_id: jurusan.jurusan_id,
                nama_produk,
                deskripsi,
                harga,
                status,
                foto: {
                    create: fotos.map((url) => ({ url })),
                },
                barang: {
                    create: { stok, kondisi },
                },
            },
            include: { foto: true, barang: true },
        });

        return NextResponse.json({ message: "Produk berhasil ditambahkan", data: produk });
    } catch (error) {
        console.error("POST /api/produk error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}