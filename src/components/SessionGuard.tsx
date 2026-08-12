"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

const MARKER_KEY = "app_browser_session_active";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  const hasMarker =
    typeof window !== "undefined" ? sessionStorage.getItem(MARKER_KEY) : null;
  const isNewBrowserSession = status === "authenticated" && !hasMarker;

  useEffect(() => {
    if (status === "loading") return;

    if (isNewBrowserSession) {
      signOut({ redirect: true, callbackUrl: "/auth/login" });
      return;
    }

    sessionStorage.setItem(MARKER_KEY, "1");
  }, [status, isNewBrowserSession]);

  if (status === "loading" || isNewBrowserSession) return null;

  return <>{children}</>;
}