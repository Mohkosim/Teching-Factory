import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedKurir(id: string, userId: string) {
    const kurir = await prisma.kurirAktif.findUnique({
        where: { kurir_aktif_id: id },
        include: { jurusan: { select: { user_id: true } } },
    });
    if (!kurir || kurir.jurusan.user_id !== userId) return null;
    return kurir;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const owned = await getOwnedKurir(id, session.user.id);
    if (!owned) {
        return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });
    }

    const { status } = await req.json();
    const updated = await prisma.kurirAktif.update({
        where: { kurir_aktif_id: id },
        data: { status: !!status },
    });

    return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const owned = await getOwnedKurir(id, session.user.id);
    if (!owned) {
        return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });
    }

    await prisma.kurirAktif.delete({ where: { kurir_aktif_id: id } });
    return NextResponse.json({ message: "Berhasil dihapus" });
}