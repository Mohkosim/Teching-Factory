import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const alamatList = await prisma.alamat.findMany({
        where: { user_id: session.user.id },
        orderBy: [{ isUtama: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(alamatList);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { nama_penerima, nomor_telepon, alamat_lengkap, kota, kecamatan, provinsi, kode_pos, kota_id, isUtama } = body;

    if (!nama_penerima || !nomor_telepon || !alamat_lengkap || !kota || !kecamatan || !provinsi || !kode_pos) {
        return NextResponse.json({ message: "Semua field wajib diisi" }, { status: 400 });
    }

    const jumlahAlamat = await prisma.alamat.count({ where: { user_id: session.user.id } });
    const jadiUtama = jumlahAlamat === 0 ? true : !!isUtama;

    if (jadiUtama) {
        await prisma.alamat.updateMany({
            where: { user_id: session.user.id },
            data: { isUtama: false },
        });
    }

    const alamatBaru = await prisma.alamat.create({
        data: {
            user_id: session.user.id,
            nama_penerima,
            nomor_telepon,
            alamat_lengkap,
            kota,
            kecamatan,
            provinsi,
            kota_id,
            kode_pos,
            isUtama,
        }
    });
    return NextResponse.json(alamatBaru);
}