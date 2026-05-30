import { Package, Star } from "lucide-react";

export default function AboutTefaSection() {
    return (
        <section className="py-10 bg-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-1xl font-bold text-sky-500">Informasi</p>
            <h2 className="text-4xl text-blue-950 font-bold py-3">Apa itu Teaching Factory (TEFA)</h2>
            <p className="text-gray-500 max-w-4xl mx-auto text-base leading-relaxed">
              Teaching Factory (TEFA) adalah model pembelajaran di SMK yang menyatukan dunia pendidikan dengan
              standar industri nyata melalui produksi barang dan jasa berkualitas. Dengan mengerjakan pesanan
              langsung dari masyarakat dan mitra industri, siswa tidak hanya menguasai teori, tetapi juga membangun
              kompetensi profesional yang selaras dengan kebutuhan dunia kerja masa kini.
            </p>
          </div>

          {/* Stats Strip */}
          <div className="flex justify-center">
            <div className="inline-flex flex-col sm:flex-row mx-auto items-center gap-6 bg-black backdrop-blur-md rounded-2xl px-8 py-5 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-400 w-10 h-10 rounded-xl flex items-center justify-center">
                  <Star size={18} className="text-yellow-800 fill-yellow-800" />
                </div>
                <div className="text-left">
                  <div className="text-white font-bold text-xl">100K+</div>
                  <div className="text-white/70 text-xs">Product Review</div>
                </div>
              </div>

              <div className="hidden sm:block w-px h-12 bg-white/25" />

              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={18} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              <div className="hidden sm:block w-px h-12 bg-white/25" />

              <div className="flex items-center gap-3">
                <div className="bg-primary-dark w-10 h-10 rounded-xl flex items-center justify-center">
                  <Package size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="text-white font-bold text-xl">1000+</div>
                  <div className="text-white/70 text-xs">Produk dari SMK</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
}