import { StatCard } from "@/components/layout/admin/dashboard/shared/StatsCard";
import { FaBoxArchive } from "react-icons/fa6";
import { MdMiscellaneousServices, MdStickyNote2 } from "react-icons/md";
import { StatItem } from "@/types/dashboard";
import { getStatsAdminJurusan } from "@/lib/getdata/get-stats";

export async function StatsAdminJurusan() {
  const { totalProduk, totalJasa, totalPesanan } = await getStatsAdminJurusan();

  const stats: StatItem[] = [
    {
      title: "Produk",
      value: totalProduk,
      description: "Jumlah produk",
      icon: <FaBoxArchive className="w-10 h-10 text-sky-500" />,
      iconBg: "bg-sky-100",
    },
    {
      title: "Jasa",
      value: totalJasa,
      description: "Jumlah jasa",
      icon: <MdMiscellaneousServices className="w-10 h-10 text-sky-500" />,
      iconBg: "bg-sky-100",
    },
    {
      title: "Pesanan",
      value: totalPesanan,
      description: "Jumlah pesanan",
      icon: <MdStickyNote2 className="w-10 h-10 text-sky-500" />,
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