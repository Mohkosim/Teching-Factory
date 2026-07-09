import { StatCard } from "@/components/layout/admin/dashboard/shared/StatsCard";
import { IoSchool } from "react-icons/io5";
import { MdSwitchAccount } from "react-icons/md";
import { StatItem } from "@/types/dashboard";

const stats: StatItem[] = [
  {
    title: "Total Sekolah",
    value: 24,
    description: "Jumlah sekolah terdaftar",
    href: "/dashboard/superAdmin/sekolah",
    icon: <IoSchool className="w-10 h-10 text-sky-500" />,
    iconBg: "bg-sky-100",
  },
  {
    title: "Total Admin",
    value: 12,
    description: "Admin aktif di seluruh sekolah",
    href: "/dashboard/superAdmin/admin",
    icon: <MdSwitchAccount className="w-10 h-10 text-sky-500" />,
    iconBg: "bg-sky-100",
  },
];

export function StatsSuperAdmin () {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((item) => (
        <StatCard key={item.title} {...item} />
      ))}
    </div>
  );
}