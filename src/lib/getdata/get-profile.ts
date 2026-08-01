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

        alamat: user.smk?.alamat ?? null,
        kota: user.smk?.kota ?? null,
        provinsi: user.smk?.provinsi ?? null,
        tahun_berdiri: user.smk?.tahun_berdiri ?? null,

        deskripsi: user.jurusan?.deskripsi ?? null,
        kepala_jurusan: user.jurusan?.kepala_jurusan ?? null,
        jam_operasional: user.jurusan?.jam_operasional ?? null,
    };
}