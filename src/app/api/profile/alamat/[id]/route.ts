import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: edit alamat / jadikan utama
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const existing = await prisma.alamat.findUnique({ where: { alamat_id: id } });
    if (!existing || existing.user_id !== session.user.id) {
        return NextResponse.json({ message: "Alamat tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { nama_penerima, nomor_telepon, alamat_lengkap, kota, kecamatan, provinsi, kode_pos, kota_id, isUtama } = body;

    if (isUtama === true) {
        await prisma.alamat.updateMany({
            where: { user_id: session.user.id },
            data: { isUtama: false },
        });
    }

    const updated = await prisma.alamat.update({
        where: { alamat_id: id },
        data: {
            ...(nama_penerima !== undefined ? { nama_penerima } : {}),
            ...(nomor_telepon !== undefined ? { nomor_telepon } : {}),
            ...(alamat_lengkap !== undefined ? { alamat_lengkap } : {}),
            ...(kota !== undefined ? { kota } : {}),
            ...(kecamatan !== undefined ? { kecamatan } : {}),
            ...(provinsi !== undefined ? { provinsi } : {}),
            ...(kota_id !== undefined ? { kota_id } : {}),
            ...(kode_pos !== undefined ? { kode_pos } : {}),
            ...(isUtama !== undefined ? { isUtama } : {}),
        },
    });

    return NextResponse.json(updated);
}

// DELETE: hapus alamat
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const existing = await prisma.alamat.findUnique({ where: { alamat_id: id } });
    if (!existing || existing.user_id !== session.user.id) {
        return NextResponse.json({ message: "Alamat tidak ditemukan" }, { status: 404 });
    }

    await prisma.alamat.delete({ where: { alamat_id: id } });

    // Kalau yang dihapus adalah alamat utama, jadikan alamat lain (terbaru) sebagai utama
    if (existing.isUtama) {
        const next = await prisma.alamat.findFirst({
            where: { user_id: session.user.id },
            orderBy: { createdAt: "desc" },
        });
        if (next) {
            await prisma.alamat.update({
                where: { alamat_id: next.alamat_id },
                data: { isUtama: true },
            });
        }
    }

    return NextResponse.json({ message: "Berhasil dihapus" });
}