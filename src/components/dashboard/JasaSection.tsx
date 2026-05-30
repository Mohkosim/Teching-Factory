import Link from "next/link";
import { ArrowRight, Heart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const services = [
  {
    id: 1,
    name: "Nama Jasa",
    school: "SMKN A",
    jurusan: "Jurusan Tata Busana",
    image: "https://images.unsplash.com/photo-1562440499-64c9a111f713?w=400&h=300&fit=crop",
    category: "Jasa",
    estimasi: "5 - 10 hari",
    rating: 4.5,
    projectSelesai: 5,
    priceMin: 20000,
    priceMax: 50000,
  },
  {
    id: 2,
    name: "Nama Jasa",
    school: "SMKN B",
    jurusan: "Jurusan Tata Boga",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop",
    category: "Jasa",
    estimasi: "3 - 7 hari",
    rating: 4.6,
    projectSelesai: 18,
    priceMin: 35000,
    priceMax: 80000,
  },
  {
    id: 3,
    name: "Nama Jasa",
    school: "SMKN C",
    jurusan: "Jurusan Patiseri",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop",
    category: "Jasa",
    estimasi: "1 - 3 hari",
    rating: 4.9,
    projectSelesai: 32,
    priceMin: 15000,
    priceMax: 40000,
  },
  {
    id: 4,
    name: "Nama Jasa",
    school: "SMKN D",
    jurusan: "Jurusan Kuliner",
    image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop",
    category: "Jasa",
    estimasi: "2 - 5 hari",
    rating: 4.7,
    projectSelesai: 15,
    priceMin: 25000,
    priceMax: 60000,
  },
];

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function JasaSection() {
  return (
    <section className="py-10 gradient-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-sm font-bold text-sky-500">Jasa</p>
          <h2 className="text-4xl text-blue-950 font-bold py-3">Jasa Siswa</h2>
          <p className="text-gray-500">Jasa yang diproduksi oleh siswa</p>
        </div>
        <div className="flex justify-end mb-8">
          <Link
            href="/jasa"
            className="hidden sm:inline-flex items-center gap-2 text-sky-500 font-semibold text-sm hover:gap-3 transition-all duration-200"
          >
            Lihat Semua <ArrowRight size={16} />
          </Link>
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <Card
              key={service.id}
              className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white p-0"
            >
              {/* Image Area */}
              <div className="relative h-52 overflow-hidden bg-gray-50">
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Category Badge top-left */}
                <Badge className="absolute top-3 left-3 bg-sky-400 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                  {service.category}
                </Badge>
                {/* Wishlist button top-right */}
                <button className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow">
                  <Heart size={14} className="text-gray-400 hover:text-red-400 transition-colors" />
                </button>
              </div>

              {/* Card Content */}
              <CardContent className="p-4 space-y-1.5">
                {/* Nama Jasa & Project Selesai */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{service.name}</h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{service.projectSelesai} Project Selesai</span>
                </div>

                {/* Estimasi & Rating */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Estimasi Pengerjaan:{" "}
                    <span className="text-gray-600 font-medium">{service.estimasi}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-semibold text-gray-700">{service.rating}</span>
                  </div>
                </div>

                {/* Price Range */}
                <p className="text-end font-bold text-gray-900">
                  {formatRupiah(service.priceMin)} - {formatRupiah(service.priceMax)}
                </p>

                {/* Divider + Footer */}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                  {/* Jurusan info */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(service.jurusan)}&background=0ea5e9&color=fff&size=32`}
                      />
                      <AvatarFallback className="bg-sky-100 text-sky-600 text-xs">
                        {service.jurusan.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{service.jurusan}</p>
                      <p className="text-xs text-gray-400 truncate leading-tight">{service.school}</p>
                    </div>
                  </div>

                  {/* Lihat Jasa button */}
                  <Link href={`/jasa/${service.id}`} className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold border-sky-400 text-sky-500 hover:bg-sky-50 hover:text-sky-600 rounded-lg px-3 py-1 h-auto"
                    >
                      Lihat Jasa
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile See All */}
        <div className="text-center mt-8 sm:hidden">
          <Link
            href="/jasa"
            className="inline-flex items-center gap-2 bg-sky-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-sky-600 transition-colors duration-200"
          >
            Lihat Semua Jasa <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}