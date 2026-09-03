"use client";

import { SessionProvider } from "next-auth/react";
import SessionGuard from "@/components/SessionGuard";
import SplashScreen from "@/components/SplashScreen";
import NavigationInterceptor from "@/components/NavigationInterceptor";
import { SplashProvider } from "@/components/SplashContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>
        <SplashProvider>
          <NavigationInterceptor />
          <SplashScreen>{children}</SplashScreen>
        </SplashProvider>
      </SessionGuard>
    </SessionProvider>
  );
}