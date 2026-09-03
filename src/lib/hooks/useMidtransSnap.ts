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

export function useMidtransSnap() {

    const [ready, setReady] = useState(isSnapAlreadyLoaded);

    useEffect(() => {

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