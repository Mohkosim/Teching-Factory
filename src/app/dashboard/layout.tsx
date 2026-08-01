"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/admin/navbar";
import { Sidebar } from "@/components/layout/admin/sidebar";

export default function SuperAdmin({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const { data: session, status } = useSession();
    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center bg-sky-100" />;
    }

    const role = session?.user?.role ?? "SuperAdmin";

    return (
        <div className="flex h-screen overflow-hidden bg-sky-100">
            <Sidebar collapsed={collapsed} role={role} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Navbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((prev) => !prev)} />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}