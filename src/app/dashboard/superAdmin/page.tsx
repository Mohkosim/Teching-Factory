import { IoSchool } from "react-icons/io5";
import { MdSwitchAccount } from "react-icons/md";
import { StatsCard } from "@/components/layout/admin/dashboard/StatsCard";
import { StatisticsChart } from "@/components/layout/admin/dashboard/StatisticsChart";
import { ContactsInTable } from "@/components/layout/admin/dashboard/ContactsInTable";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function DashboardPage() {
    return (
        <div className="space-y-6 px-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Dashboard
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">Umum</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Dashboard</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatsCard
                    value="30 SMK"
                    title="Jumlah SMK Terdaftar"
                    description=""
                    href="/dashboard/manajemen-akun"
                    icon={<IoSchool className="w-10 h-10 text-sky-500" />}
                    iconBg="bg-sky-100"
                />
                <StatsCard
                    value="3210"
                    title="Jumlah Akun SMK"
                    description=""
                    href="/dashboard/manajemen-akun"
                    icon={<MdSwitchAccount className="w-10 h-10 text-sky-500" />}
                    iconBg="bg-sky-100"
                />
            </div>

            {/* Charts & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <StatisticsChart />
                <ContactsInTable />
            </div>
        </div>
    );
}