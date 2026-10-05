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

const PATH_TANPA_FORCE_LOGOUT = ["/profile/pengajuan-mitra"];

function isPathTanpaForceLogout() {
  if (typeof window === "undefined") return false;
  const { pathname } = window.location;
  return PATH_TANPA_FORCE_LOGOUT.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isNewBrowserSession =
    status === "authenticated" && !hasMarker() && !isPathTanpaForceLogout();

  useEffect(() => {
    if (status === "loading") return;

    if (isNewBrowserSession) {
      const { pathname, search } = window.location;
      const tujuan = pathname.startsWith("/auth") ? "" : pathname + search;
      const loginUrl = tujuan
        ? `/auth/login?callbackUrl=${encodeURIComponent(tujuan)}`
        : "/auth/login";
      setMarker();
      signOut({ redirect: true, callbackUrl: loginUrl });
      return;
    }

    setMarker();
  }, [status, isNewBrowserSession]);

  if (status === "loading" || isNewBrowserSession) return null;

  return <>{children}</>;
}