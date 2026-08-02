import { StatCard } from "@/components/layout/admin/dashboard/shared/StatsCard";
import { IoSchool } from "react-icons/io5";
import { MdSwitchAccount } from "react-icons/md";
import { StatItem } from "@/types/dashboard";
import { getStatsSuperAdmin } from "@/lib/getdata/get-stats";

export async function StatsSuperAdmin() {
  const { totalSekolah, totalAdmin } = await getStatsSuperAdmin();

  const stats: StatItem[] = [
    {
      title: "Total Sekolah",
      value: totalSekolah,
      description: "Jumlah sekolah terdaftar",
      icon: <IoSchool className="w-10 h-10 text-sky-500" />,
      iconBg: "bg-sky-100",
    },
    {
      title: "Total Admin",
      value: totalAdmin,
      description: "Admin aktif di seluruh sekolah",
      icon: <MdSwitchAccount className="w-10 h-10 text-sky-500" />,
      iconBg: "bg-sky-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((item) => (
        <StatCard key={item.title} {...item} />
      ))}
    </div>
  );
}