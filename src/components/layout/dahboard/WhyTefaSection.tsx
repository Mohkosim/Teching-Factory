import { ShieldCheck, Zap, Globe, HeartHandshake } from "lucide-react";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Sentralisasi Produk",
    desc: "Semua hasil karya siswa dari berbagai jurusan kini terdokumentasi dalam satu database terpusat yang rapi.",
  },
  {
    icon: Zap,
    title: "Manajemen Multi-tenant",
    desc: "Setiap jurusan memiliki ruang kelola mandiri namun tetap dalam pengawasan penuh pihak sekolah.",
  },
  {
    icon: Globe,
    title: "Transparansi Finansial",
    desc: "Mempermudah Admin Jurusan dalam menyusun dan memantau laporan keuangan hasil penjualan produk secara akurat",
  },
  {
    icon: HeartHandshake,
    title: "Aksesibilitas Tinggi",
    desc: "Platform berbasis web memudahkan mitra industri atau pembeli untuk melihat katalog produk kapan saja dan di mana saja.",
  },
];

export default function WhyTefaSection() {
    return (
        <section className="py-10 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-1xl font-bold text-sky-500">Keunggulan Sistem</p>
            <h2 className="text-4xl text-blue-950 font-bold py-3">Mengapa Menggunakan Website Tefa</h2>
            <p className="text-gray-500">Bersama kami SMK Bisa</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reasons.map((reason, i) => (
              <div
                key={i}
                className="bg-sky-500 p-6 rounded-2xl text-white text-center card-hover group cursor-default hover:bg-sky-600 transition-colors"
              >
                <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-white/25 transition-colors duration-300">
                  <reason.icon size={28} className="text-white" />
                </div>
                <h3 className="font-display font-bold text-base mb-3 leading-snug">{reason.title}</h3>
                <p className="text-white/75 text-sm leading-relaxed">{reason.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
}