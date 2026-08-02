import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { galeriSchema } from "@/lib/validations/galeri";

async function assertOwned(galeriId: string, userId: string) {
    const galeri = await prisma.galeri.findUnique({ where: { galeri_id: galeriId } });
    if (!galeri || galeri.user_id !== userId) return null;
    return galeri;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminSMK", "AdminJurusan"].includes(session.user.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const galeri = await assertOwned(id, session.user.id);
    if (!galeri) {
        return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(galeri);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminSMK", "AdminJurusan"].includes(session.user.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = galeriSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
    }

    const galeri = await assertOwned(id, session.user.id);
    if (!galeri) {
        return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });
    }

    try {
        const updated = await prisma.galeri.update({
            where: { galeri_id: id },
            data: parsed.data,
        });

        return NextResponse.json({ message: "Foto berhasil diperbarui", data: updated });
    } catch (error) {
        console.error("PATCH /api/galeri/[id] error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminSMK", "AdminJurusan"].includes(session.user.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const galeri = await assertOwned(id, session.user.id);
    if (!galeri) {
        return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });
    }

    try {
        await prisma.galeri.delete({ where: { galeri_id: id } });
        return NextResponse.json({ message: "Foto berhasil dihapus" });
    } catch (error) {
        console.error("DELETE /api/galeri/[id] error:", error);
        return NextResponse.json({ message: "Gagal menghapus foto" }, { status: 500 });
    }
}