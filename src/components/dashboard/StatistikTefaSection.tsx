'use client'
import { useEffect, useRef, useState } from 'react'

const stats = [
    { img: '/img/smk.png', label: 'SMK', value: 7 },
    { img: '/img/produk.png', label: 'Produk', value: 60 },
    { img: '/img/team.png', label: 'Mitra Industri', value: 18 },
]

function AnimatedNumber({ target }: { target: number }) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)
    const started = useRef(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true
                    let start = 0
                    const duration = 1500
                    const startTime = performance.now()
                    const tick = (now: number) => {
                        const progress = Math.min((now - startTime) / duration, 1)
                        const eased = 1 - Math.pow(1 - progress, 3)
                        setCount(Math.floor(eased * target))
                        if (progress < 1) requestAnimationFrame(tick)
                        else setCount(target)
                    }
                    requestAnimationFrame(tick)
                }
            },
            { threshold: 0.4 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [target])

    return <span ref={ref}>{count}</span>
}

export default function StatistikTefaSection() {
    return (
        <section className="py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-40">

                <div className="text-center mb-16">
                    <p className="text-1xl font-bold text-sky-500">Statistik</p>
                    <h2 className="text-4xl text-blue-950 font-bold py-3">
                        Statistik <span className="text-primary">TEFA</span>
                    </h2>
                    <p className="text-gray-500">Produk terbaru yang diproduksi oleh siswa kreatif</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {stats.map((s, i) => (
                        <div
                            key={i}
                            className="relative bg-white rounded-3xl p-8 border shadow-xl overflow-hidden"
                            style={{ 
                                backgroundImage: 'radial-gradient(circle at 100% 100%, #68aab0 0%, #ffffff 70%)'
                            }}
                        >
                            {/* ICON DI KANAN BAWAH */}
                            <img
                                src={s.img}
                                alt={s.label}
                                className="absolute bottom-0 right-0 w-28 opacity-90"
                            />

                            {/* LABEL */}
                            <p className="text-gray-700 font-semibold mb-8">
                                {s.label}
                            </p>

                            {/* NUMBER */}
                            <div className="text-5xl font-extrabold text-black">
                                <AnimatedNumber target={s.value} />
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    )
}