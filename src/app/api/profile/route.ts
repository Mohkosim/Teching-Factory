import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/lib/getdata/get-profile";

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
        phone,
        gender,
        // AdminSMK
        kepala_sekolah,
        deskripsi_smk,
        alamat,
        kecamatan,
        kota,
        kota_id,
        kode_pos,
        provinsi,
        latitude, 
        longitude, 
        tahun_berdiri,
        // AdminJurusan
        deskripsi,
        kepala_jurusan,
        jam_operasional,
    } = body as {
        name?: string;
        email?: string;
        img?: string;
        gender?: "Laki_laki" | "Perempuan";
        phone?: string;
        kepala_sekolah?: string;
        deskripsi_smk?: string;
        alamat?: string;
        kecamatan?: string;
        kota?: string;
        kota_id?: number | null;
        kode_pos?: string;
        provinsi?: string;
        latitude?: number | null;   
        longitude?: number | null; 
        tahun_berdiri?: number | string;
        deskripsi?: string;
        kepala_jurusan?: string;
        jam_operasional?: string;
    };

    if (email) {
        const existing = await prisma.user.findFirst({
            where: { email, NOT: { user_id: session.user.id } },
        });
        if (existing) {
            return NextResponse.json({ message: "EmailTaken" }, { status: 409 });
        }
    }

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
        if (!kepala_sekolah || !phone || !alamat || !kota || !provinsi || !tahun_berdiri || !kota_id) {
            return NextResponse.json(
                { message: "Nama kepala sekolah, nomor telepon, alamat, kecamatan/kota, provinsi, tahun berdiri, dan lokasi peta wajib diisi" },
                { status: 400 }
            );
        }
    }

    const updatedUser = await prisma.user.update({
        where: { user_id: session.user.id },
        data: {
            ...(name !== undefined ? { name } : {}),
            ...(email !== undefined ? { email } : {}),
            ...(img !== undefined ? { img } : {}),
            ...(phone !== undefined ? { phone } : {}),
            ...(gender !== undefined ? { gender } : {}),
        },
        select: {
            user_id: true,
            role: true,
            smk: { select: { smk_id: true } },
            jurusan: { select: { jurusan_id: true } },
        },
    });

    if (updatedUser.role === "AdminSMK") {
        if (updatedUser.smk?.smk_id) {
            await prisma.sMK.update({
                where: { smk_id: updatedUser.smk.smk_id },
                data: {
                    ...(kepala_sekolah !== undefined ? { kepala_sekolah } : {}),
                    ...(deskripsi_smk !== undefined ? { deskripsi: deskripsi_smk } : {}),
                    ...(alamat !== undefined ? { alamat } : {}),
                    ...(kecamatan !== undefined ? { kecamatan } : {}),
                    ...(kota !== undefined ? { kota } : {}),
                    ...(kota_id !== undefined ? { kota_id } : {}),
                    ...(kode_pos !== undefined ? { kode_pos } : {}),
                    ...(provinsi !== undefined ? { provinsi } : {}),
                    ...(latitude !== undefined ? { latitude } : {}),    
                    ...(longitude !== undefined ? { longitude } : {}), 
                    ...(tahun_berdiri !== undefined ? { tahun_berdiri: Number(tahun_berdiri) } : {}),
                },
            });
        } else {
            await prisma.sMK.create({
                data: {
                    user_id: updatedUser.user_id,
                    kepala_sekolah: kepala_sekolah!,
                    deskripsi: deskripsi_smk,
                    alamat: alamat!,
                    kecamatan: kecamatan,  
                    kota: kota!,
                    kota_id: kota_id,      
                    kode_pos: kode_pos,      
                    provinsi: provinsi!,
                    latitude: latitude,    
                    longitude: longitude,  
                    tahun_berdiri: Number(tahun_berdiri),
                },
            });
        }
    }

    if (updatedUser.role === "AdminJurusan" && updatedUser.jurusan?.jurusan_id) {
        await prisma.jurusan.update({
            where: { jurusan_id: updatedUser.jurusan.jurusan_id },
            data: {
                ...(deskripsi !== undefined ? { deskripsi } : {}),
                ...(kepala_jurusan !== undefined ? { kepala_jurusan } : {}),
                ...(jam_operasional !== undefined ? { jam_operasional } : {}),
            },
        });
    }

    const fresh = await getCurrentUserProfile();
    return NextResponse.json(fresh);
}