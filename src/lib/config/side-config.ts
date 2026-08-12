type UserRole = "SuperAdmin" | "AdminSMK" | "AdminJurusan" | "User";

interface GetProfilePathParams {
    role?: UserRole;
    smkSlug?: string | null;
    jurusanSlug?: string | null;
}

export const getProfilePath = ({ role, smkSlug, jurusanSlug }: GetProfilePathParams) => {
    switch (role) {
        case "SuperAdmin":
            return "/dashboard/superAdmin/profile";

        case "AdminSMK":
            return smkSlug
                ? `/dashboard/adminSMK/${smkSlug}/profile`
                : "/dashboard/adminSMK"; // fallback kalau slug belum ada

        case "AdminJurusan":
            return smkSlug && jurusanSlug
                ? `/dashboard/adminJurusan/${smkSlug}/${jurusanSlug}/profile`
                : "/dashboard/adminJurusan";

        default:
            return "/dashboard/profile";
    }
};