import { Megaphone, Globe2, Users, Award } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

const benefits = [
    {
        icon: Megaphone,
        title: 'Media Promosi Gratis',
        desc: 'Promosikan produk dan jasa siswa Anda ke ribuan pembeli potensial tanpa biaya.',
    },
    {
        icon: Globe2,
        title: 'Tidak Perlu Buat Website Sendiri',
        desc: 'Gunakan platform TEFA yang sudah siap pakai, tanpa perlu keluar biaya pengembangan.',
    },
    {
        icon: Users,
        title: 'Terhubung Langsung dengan Pasar',
        desc: 'Siswa Anda berlatih berjualan dan berinteraksi langsung dengan konsumen nyata.',
    },
    {
        icon: Award,
        title: 'Kredibilitas & Branding Bersama',
        desc: 'Bergabung bersama jaringan SMK terpercaya dan tingkatkan citra sekolah Anda.',
    },
]

export default function SchoolOnboarding() {
    return (
        <section className="py-20 px-4 bg-sky-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-1xl font-bold text-sky-500">School Onboarding</p>
                    <h2 className="text-4xl text-blue-950 font-bold py-3">School Onboarding Section</h2>
                    <p className="text-gray-500">Kenapa SMK perlu bergabung ke Platform TEFA?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                    {benefits.map((b, i) => (
                        <div
                            key={i}
                            className="bg-sky-500 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center card-hover group hover:bg-sky-600 transition-colors"
                        >
                            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                                <b.icon size={24} className="text-white" />
                            </div>
                            <h3 className="font-bold text-white text-sm mb-2 leading-snug">{b.title}</h3>
                            <p className="text-white/75 text-xs leading-relaxed">{b.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="text-center">
                    <a
                        href="/auth/register"
                        className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors shadow-xl shadow-black/20 text-sm"
                    >
                        Daftarkan Sekolah Anda Sekarang <ArrowRight size={16} />
                    </a>
                </div>
            </div>
        </section>
    )
}