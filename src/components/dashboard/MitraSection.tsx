import { ArrowRight, School } from 'lucide-react'
import { getSMKList } from "@/lib/getdata/getSMKList";
import Image from 'next/image'

export default async function MitraSection() {
    const smkResult = await getSMKList({
        page: 1,
        perPage: 8,
        sort: "terbaru",
    });

    const belumAdaMitra = smkResult.data.length === 0;

    return (
        <section id="smk" className="py-10 bg-sky-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-5">
                    <p className="text-1xl font-bold text-sky-500">Mitra</p>
                    <h2 className="text-4xl text-blue-950 font-bold py-3">Mitra Kami</h2>
                    <div className="mt-4">
                        <a href="/auth/register"
                            className="inline-flex items-center gap-2 bg-sky-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-sky-600 transition-colors"
                        >
                            Bergabung <ArrowRight size={14} />
                        </a>
                    </div>
                </div>

                {belumAdaMitra ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-sky-300 bg-white/60 py-14 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
                            <School className="h-7 w-7 text-sky-500" />
                        </div>
                        <p className="font-semibold text-blue-950">Belum ada mitra SMK</p>
                        <p className="max-w-sm text-sm text-gray-500">
                            Sekolah kamu bisa jadi mitra pertama kami. Yuk daftar dan mulai jual produk atau jasa hasil karya siswa!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                        {smkResult.data.map((p) => (
                            <div
                                key={p.smk_id}
                                className="bg-white rounded-2xl p-5 text-center border border-primary/10 card-hover cursor-pointer group"
                            >
                                <Image
                                    src={p.img || "/img/logo.png"}
                                    alt={p.nama_smk}
                                    width={100}
                                    height={100}
                                    className='mx-auto'
                                />
                                <h3 className="font-bold text-dark text-sm group-hover:text-primary transition-colors">{p.nama_smk}</h3>

                                <p className="text-primary text-xs font-semibold mt-1">{p.jumlahJurusan} Jurusan</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}