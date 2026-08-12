
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-8">
            <div className="flex w-full max-w-5xl bg-white shadow-2xl rounded-2xl p-3 sm:p-4 min-h-150">
                <div className="hidden lg:flex lg:w-1/2 bg-sky-400 rounded-2xl flex-col justify-between p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-sky-300/40 rounded-full -translate-y-1/3 translate-x-1/3" />
                    <div className="absolute bottom-24 left-0 w-48 h-48 bg-sky-300/30 rounded-full translate-x-[-30%]" />
                    <div className="relative z-10">
                        <p className="text-sky-100 text-sm leading-relaxed max-w-xs mb-2">
                            Haii bagaimana harimu?
                        </p>
                        <h2 className="text-3xl font-bold text-white mb-3 leading-snug">
                            Selamat datang di platform TEFA,
                        </h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative z-10 mt-6">
                        <Image
                            src="/icons/iconsafe.png"
                            alt="Illustration"
                            width={500} 
                            height={500} 
                            className="object-contain w-auto h-auto mx-auto block"
                        />
                    </div>
                    <span className="absolute bottom-16 right-12 w-3 h-3 bg-white/50 rounded-full" />
                    <span className="absolute bottom-32 left-16 w-4 h-4 bg-white/30 rounded-full" />
                    <span className="absolute top-1/2 left-8 w-2.5 h-2.5 bg-white/40 rounded-full" />
                </div>

                <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
                    <div className="w-full max-w-sm space-y-8">
                        {children}
                    </div>
                </div>

            </div>
        </div>
    );
}