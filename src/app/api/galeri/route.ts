import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { galeriSchema } from "@/lib/validations/galeri";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminSMK", "AdminJurusan"].includes(session.user.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const galeriList = await prisma.galeri.findMany({
        where: { user_id: session.user.id },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(galeriList);
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminSMK", "AdminJurusan"].includes(session.user.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = galeriSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
    }

    try {
        const galeri = await prisma.galeri.create({
            data: {
                user_id: session.user.id,
                ...parsed.data,
            },
        });

        return NextResponse.json({ message: "Foto berhasil ditambahkan", data: galeri });
    } catch (error) {
        console.error("POST /api/galeri error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}