"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu, X, Bell, ShoppingCart, ChevronDown,
  User as UserIcon, LogOut, Heart, Package,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
                <button
                  type="button"
                  className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                  aria-label="Notifikasi"
                >
                  <Bell size={20} />
                </button>

                <Link
                  href="/keranjang"
                  className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                  aria-label="Keranjang"
                >
                  <ShoppingCart size={20} />
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
                      <Link href="/keranjang" className="flex items-center gap-2 cursor-pointer">
                        <ShoppingCart size={16} /> Keranjang
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/pesanan" className="flex items-center gap-2 cursor-pointer">
                        <Package size={16} /> Pesanan
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/favorite" className="flex items-center gap-2 cursor-pointer">
                        <Heart size={16} /> Favorite
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
              <Link href="/keranjang" onClick={() => setIsOpen(false)} className="block py-1.5 text-sm text-gray-600">Keranjang</Link>
              <Link href="/pesanan" onClick={() => setIsOpen(false)} className="block py-1.5 text-sm text-gray-600">Pesanan</Link>
              <Link href="/favorite" onClick={() => setIsOpen(false)} className="block py-1.5 text-sm text-gray-600">Favorite</Link>

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