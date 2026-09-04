import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth"; // sesuaikan path authOptions kamu
import {
  getSmkIdByUser,
  getStatistikPenjualanJurusan,
  getProdukJasaProportion,
  getMonthlyTrend,
} from "@/lib/data/dashboard-admin-smk";

import { StatsAdminSMK } from "@/components/layout/admin/dashboard/adminSMK/StatsAdminSMK";
import { StatisticsPenjualanJurusan } from "@/components/layout/admin/dashboard/adminSMK/StatisticsPenjualanJurusan";
import { ProdukJasaChart } from "@/components/layout/admin/dashboard/adminSMK/ProdukJasaChart";
import { ProdukChart } from "@/components/layout/admin/dashboard/adminSMK/ProdukChart";
import { JasaChart } from "@/components/layout/admin/dashboard/adminSMK/JasaChart";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function AdminSMK() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "AdminSMK") {
    redirect("/auth/login");
  }

  const smk_id = await getSmkIdByUser(session.user.id);
  if (!smk_id) {
    redirect("/auth/login");
  }

  const [statistikJurusan, produkJasaProportion, produkMonthly, jasaMonthly] =
    await Promise.all([
      getStatistikPenjualanJurusan(smk_id),
      getProdukJasaProportion(smk_id),
      getMonthlyTrend(smk_id, "produk"),
      getMonthlyTrend(smk_id, "jasa"),
    ]);

  return (
    <div className="space-y-6 px-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
          Dashboard
        </h1>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>Umum</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Stats Cards */}
      <StatsAdminSMK />

      {/* Row 1: Chart besar + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <StatisticsPenjualanJurusan data={statistikJurusan} />
        </div>
        <div>
          <ProdukJasaChart data={produkJasaProportion} />
        </div>
      </div>

      {/* Row 2: Produk & Jasa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProdukChart data={produkMonthly} />
        <JasaChart data={jasaMonthly} />
      </div>
    </div>
  );
}