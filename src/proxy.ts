import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Lewati asset, api, dan file statis
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

  // Mapping role ke halaman dashboard masing-masing
  const roleRedirectMap: Record<string, string> = {
    SuperAdmin: "/dashboard/superAdmin",
    AdminSMK: "/dashboard/adminSMK",
    AdminJurusan: "/dashboard/adminJurusan",
  };

  // Belum login & bukan halaman auth → redirect ke login
  if (!token && !isAuthPage) {
    if (pathname === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Sudah login tapi akses /auth → redirect sesuai role
  if (token && isAuthPage) {
    const target = role ? roleRedirectMap[role] : undefined;
    return NextResponse.redirect(
      new URL(target ?? "/dashboard/guestSelection", req.url)
    );
  }

  // Akses /dashboard polos → redirect sesuai role
  if (token && pathname === "/dashboard") {
    const target = role ? roleRedirectMap[role] : undefined;
    return NextResponse.redirect(
      new URL(target ?? "/dashboard/guestSelection", req.url)
    );
  }

  // Proteksi per role
  if (pathname.startsWith("/dashboard/superAdmin") && role !== "SuperAdmin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (
    pathname.startsWith("/dashboard/adminSMK") &&
    role !== "AdminSMK" &&
    role !== "SuperAdmin"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (
    pathname.startsWith("/dashboard/adminJurusan") &&
    role !== "AdminJurusan" &&
    role !== "SuperAdmin"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};