"use client";

import { createContext, useContext, useState, useRef, ReactNode } from "react";

const MIN_SPLASH_DURATION = 700; 

type SplashContextType = {
    showSplash: boolean;
    triggerSplash: () => void;
    hideSplash: () => void;
};

const SplashContext = createContext<SplashContextType | null>(null);

export function SplashProvider({ children }: { children: ReactNode }) {
    const [showSplash, setShowSplash] = useState(false);
    const startTimeRef = useRef<number>(0);

    function triggerSplash() {
        startTimeRef.current = Date.now();
        setShowSplash(true);
    }

    function hideSplash() {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(MIN_SPLASH_DURATION - elapsed, 0);

        setTimeout(() => {
            setShowSplash(false);
        }, remaining);
    }

    return (
        <SplashContext.Provider value={{ showSplash, triggerSplash, hideSplash }}>
            {children}
        </SplashContext.Provider>
    );
}

export function useSplash() {
    const ctx = useContext(SplashContext);
    if (!ctx) throw new Error("useSplash harus dipakai di dalam SplashProvider");
    return ctx;
}