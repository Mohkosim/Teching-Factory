import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/getdata/get-profile";
import { isProfileComplete } from "@/lib/utils/profile-completeness";
import { DashboardShell } from "@/components/layout/admin/dashboard-shell";
import type { Role } from "@/lib/config/nav-config";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    const role = (session?.user?.role ?? "SuperAdmin") as Role;

    const profile = await getCurrentUserProfile();
    const profileComplete = isProfileComplete(role, profile);

    return (
        <DashboardShell profileComplete={profileComplete}>
            {children}
        </DashboardShell>
    );
}
