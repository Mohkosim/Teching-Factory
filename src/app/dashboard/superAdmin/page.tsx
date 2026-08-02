import { StatsSuperAdmin } from "@/components/layout/admin/dashboard/superAdmin/StatsSuperAdmin";
import { getStatsChart } from "@/lib/getdata/get-stats-chart";
import { StatisticsChart } from "@/components/layout/admin/dashboard/superAdmin/StatisticsChart";
import { ContactsInTable } from "@/components/layout/admin/dashboard/superAdmin/ContactsInTable";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function DashboardPage() {
    const chartData = await getStatsChart();

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
                            Umum
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Dashboard</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Stats Cards */}
            <StatsSuperAdmin />

            {/* Charts & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <StatisticsChart data={chartData} />
                <ContactsInTable />
            </div>
        </div>
    );
}