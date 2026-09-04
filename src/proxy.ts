import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const guestPaths = ["/", "/produk", "/jasa", "/galeri", "/smk", "/tentang", "/kontak"];

function isGuestPath(pathname: string) {
  return guestPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }


  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
  });
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
    if (isGuestPath(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (token && isAuthPage) {
    const target = role ? roleRedirectMap[role] : undefined;
    return NextResponse.redirect(new URL(target ?? "/", req.url));
  }

  if (token && pathname === "/dashboard") {
    const target = role ? roleRedirectMap[role] : undefined;
    return NextResponse.redirect(new URL(target ?? "/", req.url));
  }

  if (pathname.startsWith("/dashboard/superAdmin") && role !== "SuperAdmin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/dashboard/adminSMK")) {
    if (role !== "AdminSMK" && role !== "SuperAdmin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (role === "AdminSMK") {

      if (!smkSlug) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }

      const segments = pathname.split("/");
      const urlSlug = segments[3];

      // Buka /dashboard/adminSMK tanpa slug -> arahkan ke slug miliknya
      if (!urlSlug) {
        return NextResponse.redirect(new URL(`/dashboard/adminSMK/${smkSlug}`, req.url));
      }

      // Coba akses slug SMK lain -> paksa balik ke miliknya
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
        if (pathname !== "/dashboard/adminJurusan") {
          return NextResponse.redirect(new URL("/dashboard/adminJurusan", req.url));
        }
        return NextResponse.next();
      }

      if (!urlSmkSlug || !urlJurusanSlug) {
        return NextResponse.redirect(
          new URL(`/dashboard/adminJurusan/${smkSlug}/${jurusanSlug}`, req.url)
        );
      }

      if (urlSmkSlug !== smkSlug || urlJurusanSlug !== jurusanSlug) {
        return NextResponse.redirect(
          new URL(`/dashboard/adminJurusan/${smkSlug}/${jurusanSlug}`, req.url)
        );
      }
    }
  }

  // 🚫 Admin (SuperAdmin / AdminSMK / AdminJurusan) tidak boleh akses halaman guestSelection/user
  if (isGuestPath(pathname) && role && role !== "User") {
    const target = roleRedirectMap[role];
    return NextResponse.redirect(new URL(target ?? "/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};