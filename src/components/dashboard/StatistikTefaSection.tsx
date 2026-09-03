import { getTefaStats, TefaStats } from '@/lib/getdata/get-stats'
import Image from 'next/image'

function AnimatedNumber({ target }: { target: number }) {
    return (
        <span
            className="animated-number"
            style={
                {
                    '--target': target,
                } as React.CSSProperties
            }
        />
    )
}

export default async function StatistikTefaSection() {
    const data: TefaStats = await getTefaStats()

    const stats = [
        {
            img: '/img/smk.png',
            label: 'SMK',
            value: data.smk,
        },
        {
            img: '/img/produk.png',
            label: 'Produk',
            value: data.produk,
        },
        {
            img: '/img/team.png',
            label: 'Jasa',
            value: data.jasa,
        },
    ]

    return (
        <>
            <style>{`
                @property --number {
                    syntax: '<integer>';
                    initial-value: 0;
                    inherits: false;
                }

                @keyframes countNumber {
                    from {
                        --number: 0;
                    }

                    to {
                        --number: var(--target);
                    }
                }

                .animated-number::after {
                    content: counter(number);
                    counter-reset: number var(--number);
                    animation: countNumber 1.5s ease-out forwards;

                    /*
                     * Animasi mulai ketika elemen
                     * masuk ke area tampilan.
                     */
                    animation-timeline: view();
                    animation-range: entry 0% cover 40%;
                }
            `}</style>

            <section className="py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-40">

                    <div className="text-center mb-16">
                        <p className="text-1xl font-bold text-sky-500">
                            Statistik
                        </p>

                        <h2 className="text-4xl text-blue-950 font-bold py-3">
                            Statistik{' '}
                            <span className="text-primary">TEFA</span>
                        </h2>

                        <p className="text-gray-500">
                            Produk terbaru yang diproduksi oleh siswa kreatif
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {stats.map((s, i) => (
                            <div
                                key={i}
                                className="relative bg-white rounded-3xl p-8 border shadow-xl overflow-hidden"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(circle at 100% 100%, #68aab0 0%, #ffffff 70%)',
                                }}
                            >
                                {/* ICON DI KANAN BAWAH */}
                                <Image
                                    src={s.img}
                                    alt={s.label}
                                    width={129}
                                    height={112}
                                    className="absolute bottom-0 right-0 w-35 h-25 object-contain opacity-90 pointer-events-none"
                                />

                                {/* LABEL & NUMBER */}
                                <div className="relative z-10">
                                    <p className="text-gray-700 font-semibold mb-8">
                                        {s.label}
                                    </p>

                                    <div className="text-5xl font-extrabold text-black">
                                        <AnimatedNumber target={s.value} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </section>
        </>
    )
}