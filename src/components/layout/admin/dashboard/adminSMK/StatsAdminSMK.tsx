import { StatCard } from "@/components/layout/admin/dashboard/shared/StatsCard";
import { IoSchool } from "react-icons/io5";
import { FaBoxArchive } from "react-icons/fa6";
import { MdMiscellaneousServices } from "react-icons/md";
import { StatItem } from "@/types/dashboard";

const stats: StatItem[] = [
  {
    title: "Total Jurusan",
    value: 24,
    description: "Jumlah jurusan terdaftar",
    icon: <IoSchool className="w-10 h-10 text-sky-500" />,
    iconBg: "bg-sky-100",
  },
  {
    title: "Total Produk",
    value: 12,
    description: "Jumlah produk terdaftar",
    icon: <FaBoxArchive className="w-10 h-10 text-sky-500" />,
    iconBg: "bg-sky-100",
  },
  {
    title: "Total Jasa",
    value: 12,
    description: "Jumlah jasa terdaftar",
    icon: <MdMiscellaneousServices className="w-10 h-10 text-sky-500" />,
    iconBg: "bg-sky-100",
  },
];

export function StatsAdminSMK () {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((item) => (
        <StatCard key={item.title} {...item} />
      ))}
    </div>
  );
}