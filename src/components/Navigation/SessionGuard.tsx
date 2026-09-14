"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

const MARKER = "app_browser_session_active";

function hasMarker() {
  if (typeof window === "undefined") return false;
  return window.name.includes(MARKER);
}

function setMarker() {
  if (typeof window === "undefined") return;
  if (!window.name.includes(MARKER)) {
    window.name = window.name ? `${window.name}|${MARKER}` : MARKER;
  }
}

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isNewBrowserSession = status === "authenticated" && !hasMarker();

  useEffect(() => {
    if (status === "loading") return;

    if (isNewBrowserSession) {
      signOut({ redirect: true, callbackUrl: "/auth/login" });
      return;
    }

    setMarker();
  }, [status, isNewBrowserSession]);

  if (status === "loading" || isNewBrowserSession) return null;

  return <>{children}</>;
}