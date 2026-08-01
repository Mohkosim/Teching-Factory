import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { addJurusanSchema } from "@/lib/validations/createAccount";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminSMK") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = addJurusanSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
    }

    const { nama_jurusan, email, password } = parsed.data;

    try {
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            return NextResponse.json({ message: "EmailTaken" }, { status: 409 });
        }

        const smk = await prisma.sMK.findUnique({
            where: { user_id: session.user.id },
        });
        if (!smk) {
            return NextResponse.json({ message: "Data SMK tidak ditemukan" }, { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: nama_jurusan,
                email,
                password: hashedPassword,
                role: "AdminJurusan",
                isActive: true,
            },
        });

        const jurusan = await prisma.jurusan.create({
            data: {
                user_id: newUser.user_id,
                smk_id: smk.smk_id,
                nama_jurusan,
            },
        });

        return NextResponse.json({
            message: "Akun jurusan berhasil ditambahkan",
            data: {
                jurusan_id: jurusan.jurusan_id,
                user_id: newUser.user_id,
                smk_id: jurusan.smk_id,
                nama_jurusan: jurusan.nama_jurusan,
                deskripsi: jurusan.deskripsi,
                kepala_jurusan: jurusan.kepala_jurusan,
                jam_operasional: jurusan.jam_operasional,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                isActive: newUser.isActive,
            },
        });
    } catch (error) {
        console.error("POST /api/jurusan-account error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}