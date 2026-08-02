import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthPage = pathname.startsWith("/auth");
  const role = token?.role as string | undefined;
  const smkSlug = token?.smkSlug as string | undefined;
  const jurusanSlug = token?.jurusanSlug as string | undefined;

  const roleRedirectMap: Record<string, string> = {
    SuperAdmin: "/dashboard/superAdmin",
    AdminSMK: smkSlug ? `/dashboard/adminSMK/${smkSlug}` : "/dashboard/adminSMK",
    AdminJurusan: (smkSlug && jurusanSlug)
      ? `/dashboard/adminJurusan/${smkSlug}/${jurusanSlug}`
      : "/dashboard/adminJurusan",
  };

  if (!token && !isAuthPage) {
    if (pathname === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (token && isAuthPage) {
    const target = role ? roleRedirectMap[role] : undefined;
    return NextResponse.redirect(
      new URL(target ?? "/dashboard/guestSelection", req.url)
    );
  }

  if (token && pathname === "/dashboard") {
    const target = role ? roleRedirectMap[role] : undefined;
    return NextResponse.redirect(
      new URL(target ?? "/dashboard/guestSelection", req.url)
    );
  }

  if (pathname.startsWith("/dashboard/superAdmin") && role !== "SuperAdmin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/dashboard/adminSMK")) {
    if (role !== "AdminSMK" && role !== "SuperAdmin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (role === "AdminSMK") {
      const segments = pathname.split("/");
      const urlSlug = segments[3];

      if (!smkSlug) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }

      if (urlSlug !== smkSlug) {
        return NextResponse.redirect(new URL(`/dashboard/adminSMK/${smkSlug}`, req.url));
      }
    }
  }

  if (pathname.startsWith("/dashboard/adminJurusan")) {
    if (role !== "AdminJurusan" && role !== "SuperAdmin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (role === "AdminJurusan") {
      const segments = pathname.split("/");
      const urlSmkSlug = segments[3];
      const urlJurusanSlug = segments[4];

      if (!smkSlug || !jurusanSlug) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }

      if (urlSmkSlug !== smkSlug || urlJurusanSlug !== jurusanSlug) {
        return NextResponse.redirect(
          new URL(`/dashboard/adminJurusan/${smkSlug}/${jurusanSlug}`, req.url)
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};