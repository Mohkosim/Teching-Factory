"use client";

import { SessionProvider } from "next-auth/react";
import SessionGuard from "@/components/Navigation/SessionGuard";
import SplashScreen from "@/components/Navigation/SplashScreen";
import NavigationInterceptor from "@/components/Navigation/NavigationInterceptor";
import { SplashProvider } from "@/components/Navigation/SplashContext";

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