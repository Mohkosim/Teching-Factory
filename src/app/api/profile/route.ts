import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/lib/getdata/get-profile";

// GET: ambil profil user yang login (termasuk data SMK/Jurusan kalau ada)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const profile = await getCurrentUserProfile();
    if (!profile) {
        return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(profile);
}

// PATCH: update field dasar (name, email, img) + field spesifik sesuai role
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
        name,
        email,
        img,
        // AdminSMK
        alamat,
        kota,
        provinsi,
        tahun_berdiri,
        // AdminJurusan
        phone,
        deskripsi,
        kepala_jurusan,
        jam_operasional,
    } = body as {
        name?: string;
        email?: string;
        img?: string;
        alamat?: string;
        kota?: string;
        provinsi?: string;
        tahun_berdiri?: number | string;
        phone?: string;
        deskripsi?: string;
        kepala_jurusan?: string;
        jam_operasional?: string;
    };

    // ── Validasi email unik ──
    if (email) {
        const existing = await prisma.user.findFirst({
            where: { email, NOT: { user_id: session.user.id } },
        });
        if (existing) {
            return NextResponse.json({ message: "EmailTaken" }, { status: 409 });
        }
    }

    // ── Validasi khusus AdminSMK: kalau SMK belum ada, field wajib harus lengkap ──
    const currentUser = await prisma.user.findUnique({
        where: { user_id: session.user.id },
        select: {
            role: true,
            smk: { select: { smk_id: true } },
            jurusan: { select: { jurusan_id: true } },
        },
    });

    if (!currentUser) {
        return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
    }

    const isNewSmk = currentUser.role === "AdminSMK" && !currentUser.smk?.smk_id;
    if (isNewSmk) {
        if (!alamat || !kota || !provinsi || !tahun_berdiri) {
            return NextResponse.json(
                { message: "Alamat, kota, provinsi, dan tahun berdiri wajib diisi" },
                { status: 400 }
            );
        }
    }

    // ── Update field dasar User ──
    const updatedUser = await prisma.user.update({
        where: { user_id: session.user.id },
        data: {
            ...(name !== undefined ? { name } : {}),
            ...(email !== undefined ? { email } : {}),
            ...(img !== undefined ? { img } : {}),
        },
        select: {
            user_id: true,
            role: true,
            smk: { select: { smk_id: true } },
            jurusan: { select: { jurusan_id: true } },
        },
    });

    // ── AdminSMK: update kalau sudah ada baris SMK, create kalau belum ──
    if (updatedUser.role === "AdminSMK") {
        if (updatedUser.smk?.smk_id) {
            await prisma.sMK.update({
                where: { smk_id: updatedUser.smk.smk_id },
                data: {
                    ...(alamat !== undefined ? { alamat } : {}),
                    ...(kota !== undefined ? { kota } : {}),
                    ...(provinsi !== undefined ? { provinsi } : {}),
                    ...(tahun_berdiri !== undefined ? { tahun_berdiri: Number(tahun_berdiri) } : {}),
                },
            });
        } else {
            // Baris SMK belum ada sama sekali → buat baru
            await prisma.sMK.create({
                data: {
                    user_id: updatedUser.user_id,
                    alamat: alamat!,
                    kota: kota!,
                    provinsi: provinsi!,
                    tahun_berdiri: Number(tahun_berdiri),
                },
            });
        }
    }

    // ── AdminJurusan: sama polanya, update kalau ada baris jurusan ──
    if (updatedUser.role === "AdminJurusan") {
        // Update phone di tabel User
        if (phone !== undefined) {
            await prisma.user.update({
                where: { user_id: updatedUser.user_id },
                data: { phone },
            });
        }

        // Update field lain di tabel Jurusan
        if (updatedUser.jurusan?.jurusan_id) {
            await prisma.jurusan.update({
                where: { jurusan_id: updatedUser.jurusan.jurusan_id },
                data: {
                    ...(deskripsi !== undefined ? { deskripsi } : {}),
                    ...(kepala_jurusan !== undefined ? { kepala_jurusan } : {}),
                    ...(jam_operasional !== undefined ? { jam_operasional } : {}),
                },
            });
        }
    }

    const fresh = await getCurrentUserProfile();
    return NextResponse.json(fresh);
}