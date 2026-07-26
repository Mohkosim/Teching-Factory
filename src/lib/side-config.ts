type UserRole = "SuperAdmin" | "AdminSMK" | "AdminJurusan" | "User";

export const getProfilePath = (role?: UserRole) => {
    switch (role) {
        case "SuperAdmin":
            return "/dashboard/superAdmin/profile";
        case "AdminSMK":
            return "/dashboard/adminSMK/profile";
        case "AdminJurusan":
            return "/dashboard/adminJurusan/profile";
        default:
            return "/dashboard/profile";
    }
};