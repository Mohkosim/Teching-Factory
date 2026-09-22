import { prisma } from "@/lib/prisma";
import type { ProfileData } from "@/types/interfaces/profile";
import type { Role } from "@/lib/config/nav-config";

type ProfileCompletenessInput = Partial<
    Pick<
        ProfileData,
        | "alamat"
        | "kota"
        | "provinsi"
        | "kota_id"
        | "tahun_berdiri"
        | "latitude"
        | "longitude"
        | "phone"
    >
> | null;


export function isProfileComplete(role: Role, profile: ProfileCompletenessInput): boolean {
    if (!profile) return false;

    if (role === "AdminSMK") {
        return Boolean(
            profile.alamat &&
            profile.kota &&
            profile.provinsi &&
            profile.kota_id &&
            profile.tahun_berdiri &&
            profile.latitude != null &&
            profile.longitude != null
        );
    }

    if (role === "AdminJurusan") {
        return Boolean(profile.phone);
    }

    return true;
}


export async function checkProfileCompleteness(userId: string, role: Role): Promise<boolean> {
    if (role === "AdminSMK") {
        const smk = await prisma.sMK.findUnique({
            where: { user_id: userId },
            select: {
                alamat: true,
                kota: true,
                provinsi: true,
                kota_id: true,
                tahun_berdiri: true,
                latitude: true,
                longitude: true,
            },
        });
        return isProfileComplete(role, smk);
    }

    if (role === "AdminJurusan") {
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { phone: true },
        });
        return isProfileComplete(role, user);
    }

    return true;
}
