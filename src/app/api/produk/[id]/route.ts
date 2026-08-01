import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { produkSchema } from "@/lib/validations/produk";

async function assertOwnedByAdminJurusan(produkId: string, userId: string) {
    const produk = await prisma.produk.findUnique({
        where: { produk_id: produkId },
        include: { jurusan: true, barang: true, foto: true },
    });
    if (!produk || produk.jurusan.user_id !== userId) return null;
    return produk;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const produk = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!produk) {
        return NextResponse.json({ message: "Produk tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(produk);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = produkSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
    }

    const produk = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!produk) {
        return NextResponse.json({ message: "Produk tidak ditemukan" }, { status: 404 });
    }

    const { nama_produk, deskripsi, harga, status, fotos, stok, kondisi } = parsed.data;

    try {
        const updated = await prisma.produk.update({
            where: { produk_id: id },
            data: { nama_produk, deskripsi, harga, status },
        });

        // Ganti semua foto lama dengan daftar foto baru
        await prisma.fotoProduk.deleteMany({ where: { produk_id: id } });
        await prisma.fotoProduk.createMany({
            data: fotos.map((url) => ({ produk_id: id, url })),
        });

        if (produk.barang[0]) {
            await prisma.barang.update({
                where: { barang_id: produk.barang[0].barang_id },
                data: { stok, kondisi },
            });
        } else {
            await prisma.barang.create({
                data: { produk_id: id, stok, kondisi },
            });
        }

        return NextResponse.json({ message: "Produk berhasil diperbarui", data: updated });
    } catch (error) {
        console.error("PATCH /api/produk/[id] error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const produk = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!produk) {
        return NextResponse.json({ message: "Produk tidak ditemukan" }, { status: 404 });
    }

    try {
        await prisma.fotoProduk.deleteMany({ where: { produk_id: id } });
        await prisma.barang.deleteMany({ where: { produk_id: id } });
        await prisma.produk.delete({ where: { produk_id: id } });
        return NextResponse.json({ message: "Produk berhasil dihapus" });
    } catch (error) {
        console.error("DELETE /api/produk/[id] error:", error);
        return NextResponse.json({ message: "Gagal menghapus produk" }, { status: 500 });
    }
}