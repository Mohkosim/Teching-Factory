"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu, X, Bell, ShoppingCart, ChevronDown,
  User as UserIcon, LogOut, Heart, Package,
} from "lucide-react";
import type { NotifikasiItem } from "@/types/interfaces/notifikasi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { KeranjangItem } from "@/types/interfaces/keranjang";

const navLinks = [
  { label: "Beranda", href: "/" },
  { label: "Produk", href: "/produk" },
  { label: "Jasa", href: "/jasa" },
  { label: "SMK", href: "/smk" },
  { label: "Galeri", href: "/galeri" },
  { label: "Tentang", href: "/tentang" },
  { label: "Kontak", href: "/kontak" },
];

function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const user = session?.user;

  const [cartCount, setCartCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [pesananCount, setPesananCount] = useState(0);
  const [notifikasiList, setNotifikasiList] = useState<NotifikasiItem[]>([]);

  const fetchNotifikasi = useCallback(async () => {
    try {
      const res = await fetch("/api/notifikasi");
      if (!res.ok) return;
      const data: { notifikasi: NotifikasiItem[] } = await res.json();
      setNotifikasiList(data.notifikasi ?? []);
    } catch {
    }
  }, []);

  const fetchCartCount = useCallback(async () => {
    try {
      const res = await fetch("/api/keranjang");
      if (!res.ok) return;
      const data: { items: KeranjangItem[] } = await res.json();
      const total = data.items.reduce(
        (sum: number, item: KeranjangItem) => sum + item.kuantitas,
        0
      );
      setCartCount(total);
    } catch {
    }
  }, []);

  const fetchFavoriteCount = useCallback(async () => {
    try {
      const res = await fetch("/api/favorite");
      if (!res.ok) return;
      const data: unknown[] = await res.json();
      setFavoriteCount(data.length);
    } catch {
    }
  }, []);

  const fetchPesananCount = useCallback(async () => {
    try {
      const res = await fetch("/api/pesanan");
      if (!res.ok) return;
      const data: { produk: unknown[]; jasa: unknown[] } = await res.json();
      setPesananCount((data.produk?.length ?? 0) + (data.jasa?.length ?? 0));
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCartCount();
    fetchFavoriteCount();
    fetchPesananCount();
    fetchNotifikasi();

    const handleCartUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ count?: number }>;
      if (typeof custom.detail?.count === "number") {
        setCartCount(custom.detail.count);
      } else {
        fetchCartCount();
      }
    };

    const handleFavoriteUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ count?: number }>;
      if (typeof custom.detail?.count === "number") {
        setFavoriteCount(custom.detail.count);
      } else {
        fetchFavoriteCount();
      }
    };

    const handlePesananUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ count?: number }>;
      if (typeof custom.detail?.count === "number") {
        setPesananCount(custom.detail.count);
      } else {
        fetchPesananCount();
      }
      fetchNotifikasi();
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    window.addEventListener("favorite-updated", handleFavoriteUpdate);
    window.addEventListener("pesanan-updated", handlePesananUpdate);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchCartCount();
        fetchFavoriteCount();
        fetchPesananCount();
        fetchNotifikasi();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
      window.removeEventListener("favorite-updated", handleFavoriteUpdate);
      window.removeEventListener("pesanan-updated", handlePesananUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isLoggedIn, fetchCartCount, fetchFavoriteCount, fetchPesananCount, fetchNotifikasi]);

  const displayedNotifikasiCount = isLoggedIn ? notifikasiList.length : 0;

  const displayedCartCount = isLoggedIn ? cartCount : 0;
  const displayedFavoriteCount = isLoggedIn ? favoriteCount : 0;
  const displayedPesananCount = isLoggedIn ? pesananCount : 0;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/img/LogoTefa.png"
              alt="Logo Tefa"
              width={80}
              height={80}
              className="object-contain w-auto h-auto"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm font-medium transition-colors
                ${isLinkActive(pathname, link.href) ? "text-sky-500" : "text-gray-600 hover:text-sky-500"}`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-sky-500 rounded-full transition-all
                  ${isLinkActive(pathname, link.href) ? "w-full" : "w-0 group-hover:w-full"}`}
                />
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                      aria-label="Notifikasi"
                    >
                      <Bell size={20} />
                      {displayedNotifikasiCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                          {displayedNotifikasiCount > 99 ? "99+" : displayedNotifikasiCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {notifikasiList.length === 0 ? (
                      <div className="px-2 py-6 text-center text-xs text-gray-400">
                        Belum ada notifikasi
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notifikasiList.map((n) => (
                          <DropdownMenuItem key={n.id} asChild>
                            <Link href={n.href} className="flex items-start gap-3 cursor-pointer py-2">
                              <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                {n.thumbnail && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={n.thumbnail} alt={n.judul} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">{n.judul}</p>
                                <p
                                  className={`text-xs truncate ${n.jenis === "jasa_bayar"
                                    ? "text-yellow-600"
                                    : n.jenis === "refund_disetujui"
                                      ? "text-green-600"
                                      : n.jenis === "refund_ditolak"
                                        ? "text-red-500"
                                        : "text-gray-500"
                                    }`}
                                >
                                  {n.pesan}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{n.tanggal}</p>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link
                  href="/keranjang"
                  className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                  aria-label="Keranjang"
                >
                  <ShoppingCart size={20} />
                  {displayedCartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {displayedCartCount > 99 ? "99+" : displayedCartCount}
                    </span>
                  )}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 outline-none">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                      <AvatarFallback className="bg-sky-100 text-sky-600 font-semibold">
                        {user?.name?.charAt(0).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown size={16} className="text-gray-500" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-semibold text-gray-900">
                        Welcome, {user?.name?.split(" ")[0] ?? "User"}!
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                        <UserIcon size={16} /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/keranjang" className="flex items-center justify-between cursor-pointer">
                        <span className="flex items-center gap-2">
                          <ShoppingCart size={16} /> Keranjang
                        </span>
                        {displayedCartCount > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                            {displayedCartCount > 99 ? "99+" : displayedCartCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/pesanan" className="flex items-center justify-between cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Package size={16} /> Pesanan
                        </span>
                        {displayedPesananCount > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                            {displayedPesananCount > 99 ? "99+" : displayedPesananCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/favorite" className="flex items-center justify-between cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Heart size={16} /> Favorite
                        </span>
                        {displayedFavoriteCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 aspect-square items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                            {displayedNotifikasiCount > 99 ? "99+" : displayedNotifikasiCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-600"
                    >
                      <LogOut size={16} /> Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sky-500 font-semibold text-sm px-4 py-2 rounded-lg border border-sky-500 hover:bg-sky-500 hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-sky-500 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-sky-600"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">

          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`block py-2 text-sm font-medium transition-colors 
              ${isLinkActive(pathname, link.href) ? "text-primary" : "text-gray-600 hover:text-primary"}`}
            >
              {link.label}
            </Link>
          ))}

          {isLoggedIn ? (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-3 pb-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                  <AvatarFallback className="bg-sky-100 text-sky-600 font-semibold">
                    {user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>

              <Link href="/profile" onClick={() => setIsOpen(false)} className="block py-1.5 text-sm text-gray-600">Edit Profil</Link>
              <Link href="/keranjang" onClick={() => setIsOpen(false)} className="flex items-center justify-between py-1.5 text-sm text-gray-600">
                <span>Keranjang</span>
                {displayedCartCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {displayedCartCount > 99 ? "99+" : displayedCartCount}
                  </span>
                )}
              </Link>
              <Link href="/profile/pesanan" onClick={() => setIsOpen(false)} className="flex items-center justify-between py-1.5 text-sm text-gray-600">
                <span>Pesanan</span>
                {displayedPesananCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {displayedPesananCount > 99 ? "99+" : displayedPesananCount}
                  </span>
                )}
              </Link>
              <Link href="/favorite" onClick={() => setIsOpen(false)} className="flex items-center justify-between py-1.5 text-sm text-gray-600">
                <span>Favorite</span>
                {displayedFavoriteCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {displayedFavoriteCount > 99 ? "99+" : displayedFavoriteCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block py-1.5 text-sm text-red-500 font-medium"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link
                href="/auth/login"
                className="flex-1 text-center text-primary font-semibold text-sm px-4 py-2 rounded-lg border border-primary"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="flex-1 text-center bg-primary text-white font-semibold text-sm px-4 py-2 rounded-lg"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}