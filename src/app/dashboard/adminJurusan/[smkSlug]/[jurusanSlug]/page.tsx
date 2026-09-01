import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  getJurusanIdByUser,
  getProdukJasaProportionJurusan,
  getPendapatanBulanan,
  getPesananBulanan,
} from "@/lib/data/dashboard-admin-jurusan";

import { StatsAdminJurusan } from "@/components/layout/admin/dashboard/adminJurusan/StatsAdminJurusan";
import { ProdukJasaChart } from "@/components/layout/admin/dashboard/adminJurusan/ProdukJasaChart";
import { PendapatanChart } from "@/components/layout/admin/dashboard/adminJurusan/PendapatanChart";
import { PesananChart } from "@/components/layout/admin/dashboard/adminJurusan/PesananChart";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function AdminJurusan() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "AdminJurusan") {
    redirect("/login");
  }

  const jurusan_id = await getJurusanIdByUser(session.user.id);
  if (!jurusan_id) {
    redirect("/login");
  }

  const [produkJasaProportion, pendapatan, pesanan] = await Promise.all([
    getProdukJasaProportionJurusan(jurusan_id),
    getPendapatanBulanan(jurusan_id),
    getPesananBulanan(jurusan_id),
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
      <StatsAdminJurusan />

      {/* Row 1: Chart besar + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PendapatanChart data={pendapatan} />
        </div>
        <div>
          <ProdukJasaChart data={produkJasaProportion} />
        </div>
      </div>

      {/* Row 2: Pesanan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="lg:col-span-2">
          <PesananChart data={pesanan} />
        </div>
      </div>
    </div>
  );
}