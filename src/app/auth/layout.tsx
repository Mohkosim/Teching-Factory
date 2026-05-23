export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex">
            {/* ── Left Panel (shared) ── */}
            <div className="hidden lg:flex lg:w-[52%] bg-sky-400 rounded-r-[3rem] flex-col justify-between p-12 relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-sky-300/40 rounded-full -translate-y-1/3 translate-x-1/3" />
                <div className="absolute bottom-24 left-0 w-48 h-48 bg-sky-300/30 rounded-full translate-x-[-30%]" />

                {/* Illustration — ganti src dengan gambar asli */}
                <div className="flex-1 flex items-center justify-center">
                    <img
                        src="/icons/iconsafe.png"
                        alt="Illustration"
                        className="max-w-[50%] drop-shadow-2xl"
                    />
                </div>

                {/* Bottom text */}
                <div className="relative px-10 z-10">
                    <h2 className="text-3xl font-bold text-white mb-3">Selamat datang,</h2>
                    <p className="text-sky-100 text-sm leading-relaxed max-w-xs">
                        Horem ipsum dolor sit amet, consectetur adipiscing elit.
                    </p>
                </div>

                {/* Floating dots */}
                <span className="absolute bottom-16 right-12 w-3 h-3 bg-white/50 rounded-full" />
                <span className="absolute bottom-32 left-16 w-4 h-4 bg-white/30 rounded-full" />
                <span className="absolute top-1/2 left-8 w-2.5 h-2.5 bg-white/40 rounded-full" />
            </div>

            {/* ── Right Panel (konten per halaman) ── */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
                <div className="w-full max-w-md space-y-8">
                    {children}
                </div>
            </div>
        </div>
    );
}