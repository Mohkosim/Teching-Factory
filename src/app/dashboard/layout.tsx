import { Navbar } from "@/components/layout/admin/navbar"
import { Sidebar } from "@/components/layout/admin/sidebar"

export default function SuperAdmin({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-sky-100">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    )
}