import { ArrowRight } from 'lucide-react'

const partners = [
    { id: 1, name: 'SMKN 1 Malang', jurusan: '12 Jurusan', produk: 180 },
    { id: 2, name: 'SMKN 2 Malang', jurusan: '10 Jurusan', produk: 143 },
    { id: 3, name: 'SMKN 3 Malang', jurusan: '8 Jurusan', produk: 97 },
    { id: 4, name: 'SMKN 4 Malang', jurusan: '9 Jurusan', produk: 120 },
    { id: 5, name: 'SMKN 5 Malang', jurusan: '7 Jurusan', produk: 78 },
    { id: 6, name: 'SMKN 6 Malang', jurusan: '6 Jurusan', produk: 65 },
    { id: 7, name: 'SMKN 7 Malang', jurusan: '11 Jurusan', produk: 154 },
    { id: 8, name: 'SMKN 8 Malang', jurusan: '5 Jurusan', produk: 42 },
]


export default function MitraSection() {
    return (
        <section id="smk" className="py-10 bg-sky-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-5">
                    <p className="text-1xl font-bold text-sky-500">Mitra</p>
                    <h2 className="text-4xl text-blue-950 font-bold py-3">Mitra Kami</h2>
                    <div className="mt-4">
                        <a
                            href="#"
                            className="inline-flex items-center gap-2 bg-sky-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-sky-600 transition-colors"
                        >
                            Bergabung <ArrowRight size={14} />
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                    {partners.map((p) => (
                        <div
                            key={p.id}
                            className="bg-white rounded-2xl p-5 text-center border border-primary/10 card-hover cursor-pointer group"
                        >
                            <img 
                            src="/img/logo.png" 
                            alt="logo" 
                            className='w-50 h-55 mx-auto'
                            />
                            <h3 className="font-bold text-dark text-sm group-hover:text-primary transition-colors">{p.name}</h3>
                            <p className="text-muted text-xs mt-1">{p.jurusan}</p>
                            <p className="text-primary text-xs font-semibold mt-1">{p.produk} Produk</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}