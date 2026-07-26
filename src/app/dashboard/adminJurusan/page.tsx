import { StatsAdminJurusan } from "@/components/layout/admin/dashboard/adminJurusan/StatsAdminJurusan";
import { ProdukJasaChart } from "@/components/layout/admin/dashboard/adminSMK/ProdukJasaChart";
import { PendapatanChart } from "@/components/layout/admin/dashboard/adminJurusan/PendapatanChart";
import { PesananChart } from "@/components/layout/admin/dashboard/adminJurusan/PesananChart";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function AdminJurusan() {
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
            <StatsAdminJurusan />

            {/* Row 1: Chart besar + Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <PendapatanChart />
                </div>
                <div>
                    <ProdukJasaChart />
                </div>
            </div>

            {/* Row 2: Produk & Jasa */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="lg:col-span-2">
                    <PesananChart />
                </div>
            </div>
        </div>
    );
}