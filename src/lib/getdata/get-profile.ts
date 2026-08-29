import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ProfileData } from "@/types/interfaces/profile";

export async function getCurrentUserProfile(): Promise<ProfileData | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { user_id: session.user.id },
        include: { smk: true, jurusan: true },
    });

    if (!user) return null;

    return {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        img: user.img,
        phone: user.phone,
        gender: user.gender,

        kepala_sekolah: user.smk?.kepala_sekolah ?? null,
        deskripsi_smk: user.smk?.deskripsi ?? null,
        alamat: user.smk?.alamat ?? null,
        kecamatan: user.smk?.kecamatan ?? null,   // <-- BARU
        kota: user.smk?.kota ?? null,
        kota_id: user.smk?.kota_id ?? null,       // <-- BARU
        kode_pos: user.smk?.kode_pos ?? null,     // <-- BARU
        provinsi: user.smk?.provinsi ?? null,
        map_link: user.smk?.map_link ?? null,
        tahun_berdiri: user.smk?.tahun_berdiri ?? null,

        deskripsi: user.jurusan?.deskripsi ?? null,
        kepala_jurusan: user.jurusan?.kepala_jurusan ?? null,
        jam_operasional: user.jurusan?.jam_operasional ?? null,
    };
}