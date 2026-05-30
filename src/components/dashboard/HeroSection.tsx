import * as React from "react"
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { ChevronRight } from "lucide-react";

const backgrounds = [
  { src: "/img/image1.png", alt: "Karya Siswa 1" },
  { src: "/img/image1.png", alt: "Karya Siswa 2" },
  { src: "/img/image1.png", alt: "Karya Siswa 3" },
];

const floatingIcons = [
  { img: "/icons/icons2.png", top: "25%", left: "15%", rotate: "-6" },
  { img: "/icons/icons6.png", top: "20%", right: "15%", rotate: "6" },
  { img: "/icons/icons3.png", top: "75%", left: "20%", rotate: "-6" },
  { img: "/icons/icons4.png", top: "80%", right: "20%", rotate: "6" },
  { img: "/icons/icons5.png", top: "53%", right: "8%", rotate: "3" },
  { img: "/icons/icons1.png", top: "55%", left: "8%", rotate: "-3" },
];

export default function HeroSection() {
    const plugin = React.useRef(
        Autoplay({ delay: 5000, stopOnInteraction: false })
    )
    return (
        <section className="relative min-h-screen flex items-center overflow-hidden">
            <Carousel
                plugins={[plugin.current]}
                className="absolute inset-0 w-full h-full"
            >
                <CarouselContent className="ml-0 w-full h-full">
                    {backgrounds.map((bg, index) => (
                        <CarouselItem key={index} className="pl-0 w-full h-full">
                            <div className="relative h-screen w-full">
                                <img
                                    src={bg.src}
                                    alt={bg.alt}
                                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                                />
                                <div className="absolute inset-0 bg-black/40" />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            {/* ===== DEKORASI GARIS ===== */}
            <div>
                {/* Garis vertikal putus-putus 1 */}
                <div className="absolute top-0 bottom-0" style={{ left: "10%" }}>
                    <svg className="h-full w-px" preserveAspectRatio="none">
                        <line
                            x1="0" y1="0" x2="0" y2="100%"
                            stroke="rgba(0,0,0,0.35)"
                            strokeWidth="1"
                            strokeDasharray="6,6"
                        />
                    </svg>
                </div>

                {/* Garis vertikal putus-putus 2 */}
                <div className="absolute top-0 bottom-0" style={{ left: "25%" }}>
                    <svg className="h-full w-px" preserveAspectRatio="none">
                        <line
                            x1="0" y1="0" x2="0" y2="100%"
                            stroke="rgba(0,0,0,0.35)"
                            strokeWidth="1"
                            strokeDasharray="6,6"
                        />
                    </svg>
                </div>

                {/* Bundar Lonjong (Elips) */}
                <div
                    className="absolute border border-black/30"
                    style={{
                        left: "-10%",
                        top: "80%",
                        width: "650px",
                        height: "450px",
                        borderRadius: "125px",
                    }}
                />
            </div>

            <div>
                {/* Garis vertikal putus-putus 1 */}
                <div className="absolute top-0 bottom-0" style={{ left: "90%" }}>
                    <svg className="h-full w-px" preserveAspectRatio="none">
                        <line
                            x1="0" y1="0" x2="0" y2="100%"
                            stroke="rgba(0,0,0,0.35)"
                            strokeWidth="1"
                            strokeDasharray="6,6"
                        />
                    </svg>
                </div>

                {/* Garis vertikal putus-putus 2 */}
                <div className="absolute top-0 bottom-0" style={{ left: "75%" }}>
                    <svg className="h-full w-px" preserveAspectRatio="none">
                        <line
                            x1="0" y1="0" x2="0" y2="100%"
                            stroke="rgba(0,0,0,0.35)"
                            strokeWidth="1"
                            strokeDasharray="6,6"
                        />
                    </svg>
                </div>

                {/* Bundar Lonjong (Elips) */}
                <div
                    className="absolute border border-black/30"
                    style={{
                        left: "67%",
                        top: "80%",
                        width: "650px",
                        height: "450px",
                        borderRadius: "125px",
                    }}
                />
            </div>

            {/* Floating icons */}
            {floatingIcons.map((item, i) => (
                <div
                    key={i}
                    className="absolute hidden lg:flex w-20 h-20 bg-white rounded-2xl shadow-xl items-center justify-center text-2xl"
                    style={{
                        top: item.top,
                        left: item.left,
                        right: item.right,
                        boxShadow: `0 0 20px 10px rgba(27, 142, 230, 0.3)`,
                        transform: `rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.img}
                        alt="icon"
                    />
                </div>
            ))}

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-5 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full mb-6 border border-white/20">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Platform Resmi Teaching Factory SMK
                </div>

                {/* Headline */}
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
                    KARYA SISWA
                    <br />
                    <span className="text-yellow-300">KUALITAS INDUSTRI</span>
                </h1>

                {/* Subtitle */}
                <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                    Temukan produk dan jasa asli buatan siswa SMK,
                    <br className="hidden sm:block" />
                    siap bersaing di dunia industri.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                    <Link
                        href="/produk"
                        className="inline-flex items-center gap-2 bg-sky-500 text-white font-bold px-8 py-4 rounded-2xl hover:bg-sky-600 transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 text-base"
                    >
                        Lihat Produk
                        <ChevronRight size={18} />
                    </Link>
                    <Link
                        href="/jurusan"
                        className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-8 py-4 rounded-2xl hover:bg-sky-600 hover:border-sky-600 hover:text-white hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 text-base"
                    >
                        Lihat Jurusan
                    </Link>
                </div>
            </div>
        </section>
    )
}