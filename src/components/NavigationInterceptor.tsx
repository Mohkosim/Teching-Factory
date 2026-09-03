"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSplash } from "@/components/SplashContext";

export default function NavigationInterceptor() {
    const router = useRouter();
    const { triggerSplash } = useSplash();

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (e.defaultPrevented || e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const anchor = (e.target as HTMLElement)?.closest("a");
            if (!anchor) return;

            const href = anchor.getAttribute("href");
            if (!href) return;

            const isExternal = anchor.target === "_blank" || anchor.hasAttribute("download");
            const isSpecialProtocol = /^(mailto:|tel:|#)/.test(href);
            const isOutsideOrigin = /^https?:\/\//.test(href) && !href.startsWith(window.location.origin);

            if (isExternal || isSpecialProtocol || isOutsideOrigin) return;

            const targetUrl = new URL(href, window.location.origin);
            if (targetUrl.pathname === window.location.pathname) return;

            e.preventDefault();
            triggerSplash();
            router.push(href); 
        }

        document.addEventListener("click", handleClick, { capture: true });
        return () => document.removeEventListener("click", handleClick, { capture: true });
    }, [router, triggerSplash]);

    return null;
}