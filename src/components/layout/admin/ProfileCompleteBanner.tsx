import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface ProfileCompleteBannerProps {
    profileHref: string;
    role: "AdminSMK" | "AdminJurusan";
}

const MESSAGE: Record<ProfileCompleteBannerProps["role"], string> = {
    AdminSMK: "Lengkapi profil sekolah sebelum website ini digunakan.",
    AdminJurusan: "Lengkapi profil jurusan sebelum website ini digunakan.",
};

export function ProfileCompleteBanner({ profileHref, role }: ProfileCompleteBannerProps) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="flex-1 text-sm font-medium text-amber-800">{MESSAGE[role]}</p>
            <Link
                href={profileHref}
                className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
                Lengkapi Profil
            </Link>
        </div>
    );
}
