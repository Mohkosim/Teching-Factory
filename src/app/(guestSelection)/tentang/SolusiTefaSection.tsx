import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Wrench, ShieldCheck, Handshake, Trophy, LineChart } from "lucide-react";

const SOLUSI = [
  {
    icon: ShoppingBag,
    title: "Produk Berkualitas",
    desc: "Karya siswa dibuat dengan standar kerja industri dan pengawasan langsung dari guru pembimbing.",
  },
  {
    icon: Wrench,
    title: "Layanan Jasa Profesional",
    desc: "Beragam layanan jasa dari jurusan-jurusan SMK, siap membantu kebutuhan masyarakat sekitar.",
  },
  {
    icon: ShieldCheck,
    title: "Terverifikasi Sekolah",
    desc: "Setiap SMK dan produk yang tampil telah melalui proses verifikasi sebelum dipublikasikan.",
  },
  {
    icon: Handshake,
    title: "Menghubungkan ke Industri",
    desc: "Membuka peluang kerja sama antara sekolah, siswa, dan pelaku industri secara langsung.",
  },
  {
    icon: Trophy,
    title: "Wadah Prestasi Siswa",
    desc: "Galeri kegiatan menampilkan pameran, lomba, dan pencapaian siswa dari berbagai SMK.",
  },
  {
    icon: LineChart,
    title: "Mendukung Kewirausahaan",
    desc: "Melatih jiwa bisnis siswa sejak dini melalui pengalaman jual-beli produk yang nyata.",
  },
];

export default function SolusiTefaSection() {
  return (
    <section className="bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-6xl text-center">
        <Badge className="mb-3 bg-blue-100 text-sky-600 hover:bg-blue-100">
          Solusi TEFA
        </Badge>
        <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
          TEFA Solusi untuk Anda
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600">
          Platform yang dirancang untuk mendukung proses belajar siswa
          sekaligus memberi nilai nyata bagi masyarakat dan industri.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUSI.map(({ icon: Icon, title, desc }) => (
            <Card
              key={title}
              className="border-0 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sky-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                  {desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}