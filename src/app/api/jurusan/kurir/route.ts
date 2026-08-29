import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedJurusanId(userId: string) {
    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { jurusan: { select: { jurusan_id: true } } },
    });
    return user?.jurusan?.jurusan_id ?? null;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const jurusanId = await getOwnedJurusanId(session.user.id);
    if (!jurusanId) {
        return NextResponse.json({ message: "Jurusan tidak ditemukan" }, { status: 404 });
    }

    const kurirList = await prisma.kurirAktif.findMany({
        where: { jurusan_id: jurusanId },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(kurirList);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const jurusanId = await getOwnedJurusanId(session.user.id);
    if (!jurusanId) {
        return NextResponse.json({ message: "Jurusan tidak ditemukan" }, { status: 404 });
    }

    const { kode_kurir, nama_kurir } = await req.json();
    if (!kode_kurir || !nama_kurir) {
        return NextResponse.json({ message: "kode_kurir dan nama_kurir wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.kurirAktif.findUnique({
        where: { jurusan_id_kode_kurir: { jurusan_id: jurusanId, kode_kurir } },
    });
    if (existing) {
        return NextResponse.json({ message: "Kurir ini sudah ditambahkan" }, { status: 409 });
    }

    const created = await prisma.kurirAktif.create({
        data: { jurusan_id: jurusanId, kode_kurir, nama_kurir, status: false },
    });

    return NextResponse.json(created);
}