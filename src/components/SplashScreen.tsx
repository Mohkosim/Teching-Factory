"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useSplash } from "@/components/SplashContext";

const FIRST_LOAD_DURATION = 1600;

export default function SplashScreen({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { showSplash: navigationSplash, hideSplash } = useSplash();
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [showFirstLoadSplash, setShowFirstLoadSplash] = useState(true);
    const previousPathname = useRef(pathname);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowFirstLoadSplash(false);
            setIsFirstLoad(false);
        }, FIRST_LOAD_DURATION);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isFirstLoad) return;
        if (previousPathname.current !== pathname) {
            previousPathname.current = pathname;
            hideSplash();
        }
    }, [pathname, isFirstLoad, hideSplash]);

    const showSplash = isFirstLoad ? showFirstLoadSplash : navigationSplash;

    return (
        <>
            <div
                className={`fixed inset-0 z-9999 flex items-center justify-center bg-white transition-opacity duration-300 ${
                    showSplash ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
            >
                <div className="flex flex-col items-center gap-4">
                    <Image
                        src="/img/LogoTefa.png"
                        alt="Logo Tefa"
                        width={240}
                        height={240}
                        priority
                        className={`w-48 sm:w-60 ${isFirstLoad ? "animate-tefa-logo" : "animate-tefa-logo-fast"}`}
                    />
                    <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-tefa-dot [animation-delay:0s]" />
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-tefa-dot [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-tefa-dot [animation-delay:0.4s]" />
                    </div>
                </div>
            </div>

            <div
                className={`transition-opacity duration-300 ${
                    showFirstLoadSplash && isFirstLoad ? "opacity-0" : "opacity-100"
                }`}
            >
                {children}
            </div>
        </>
    );
}