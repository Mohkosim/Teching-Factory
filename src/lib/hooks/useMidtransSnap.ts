// hooks/useMidtransSnap.ts
"use client";

import { useEffect, useState } from "react";

declare global {
    interface Window {
        snap?: {
            pay: (
                token: string,
                callbacks?: {
                    onSuccess?: (result: unknown) => void;
                    onPending?: (result: unknown) => void;
                    onError?: (result: unknown) => void;
                    onClose?: () => void;
                }
            ) => void;
        };
    }
}

const SNAP_SRC =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

function isSnapAlreadyLoaded() {
    return typeof window !== "undefined" && Boolean(window.snap);
}

// Dipakai di semua komponen yang butuh window.snap.pay(...) — checkout produk,
// pemesanan jasa, dan tambah pembayaran/cicilan jasa. Script cuma di-load sekali
// per halaman (dicek window.snap dulu), jadi aman dipanggil dari banyak komponen.
export function useMidtransSnap() {
    // Lazy init: cek status awal di sini (bukan di effect), supaya effect di bawah
    // murni jadi "subscriber" — cocok dengan aturan react-hooks/set-state-in-effect.
    const [ready, setReady] = useState(isSnapAlreadyLoaded);

    useEffect(() => {
        // Kalau race condition sempat berubah antara render pertama & effect jalan
        // (jarang, tapi mungkin), effect ini tetap "subscribe" ke event load,
        // bukan langsung nge-set berdasarkan kondisi if/else biasa.
        if (isSnapAlreadyLoaded()) return;

        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SNAP_SRC}"]`);

        const handleLoad = () => setReady(true);
        const handleError = () => setReady(false);

        if (existing) {
            existing.addEventListener("load", handleLoad);
            existing.addEventListener("error", handleError);
            return () => {
                existing.removeEventListener("load", handleLoad);
                existing.removeEventListener("error", handleError);
            };
        }

        const script = document.createElement("script");
        script.src = SNAP_SRC;
        script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "");
        script.addEventListener("load", handleLoad);
        script.addEventListener("error", handleError);
        document.body.appendChild(script);

        return () => {
            script.removeEventListener("load", handleLoad);
            script.removeEventListener("error", handleError);
        };
    }, []);

    return ready;
}