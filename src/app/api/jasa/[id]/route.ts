import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jasaSchema } from "@/lib/validations/jasa";

async function assertOwnedByAdminJurusan(jasaId: string, userId: string) {
    const jasa = await prisma.jasa.findUnique({
        where: { jasa_id: jasaId },
        include: { produk: { include: { jurusan: true, foto: true } } },
    });
    if (!jasa || jasa.produk.jurusan.user_id !== userId) return null;
    return jasa;
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
    const jasa = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!jasa) {
        return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(jasa);
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
    const parsed = jasaSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
    }

    const jasa = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!jasa) {
        return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
    }

    const {
        nama_jasa, deskripsi, harga, status,
        estimasi_pengerjaan, total_project, fotos,
    } = parsed.data;

    try {
        await prisma.produk.update({
            where: { produk_id: jasa.produk_id },
            data: { nama_produk: nama_jasa, deskripsi, harga, status },
        });

        const updated = await prisma.jasa.update({
            where: { jasa_id: id },
            data: { nama_jasa, estimasi_pengerjaan, total_project },
        });

        // Ganti semua foto lama dengan daftar baru (foto milik Produk)
        await prisma.fotoProduk.deleteMany({ where: { produk_id: jasa.produk_id } });
        await prisma.fotoProduk.createMany({
            data: fotos.map((url) => ({ produk_id: jasa.produk_id, url })),
        });

        return NextResponse.json({ message: "Jasa berhasil diperbarui", data: updated });
    } catch (error) {
        console.error("PATCH /api/jasa/[id] error:", error);
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
    const jasa = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!jasa) {
        return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
    }

    try {
        await prisma.fotoProduk.deleteMany({ where: { produk_id: jasa.produk_id } });
        await prisma.jasa.delete({ where: { jasa_id: id } });
        await prisma.produk.delete({ where: { produk_id: jasa.produk_id } });
        return NextResponse.json({ message: "Jasa berhasil dihapus" });
    } catch (error) {
        console.error("DELETE /api/jasa/[id] error:", error);
        return NextResponse.json({ message: "Gagal menghapus jasa" }, { status: 500 });
    }
}