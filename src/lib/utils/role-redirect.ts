export const ROLE_REDIRECT: Record<string, string> = {
  SuperAdmin: "/dashboard/superAdmin",
  AdminSMK: "/dashboard/adminSMK",
  AdminJurusan: "/dashboard/adminJurusan",
  User: "/",
};

export function getRoleRedirect(role: string | undefined | null): string {
  return (role && ROLE_REDIRECT[role]) || "/";
}
