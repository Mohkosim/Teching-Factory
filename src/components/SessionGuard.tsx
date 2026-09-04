"use client";

import { useSession, signOut } from "next-auth/react";

const MARKER = "app_browser_session_active";

function hasMarker() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(MARKER) === "1";
}

function setMarker() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MARKER, "1");
}

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") return null;

  if (status === "authenticated" && !hasMarker()) {
    signOut({ redirect: true, callbackUrl: "/auth/login" });
    return null;
  }

  setMarker();

  return <>{children}</>;
}