"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Beranda", href: "/" },
  { label: "Produk", href: "/produk" },
  { label: "Jasa", href: "/jasa" },
  { label: "SMK", href: "/smk" },
  { label: "Galeri", href: "/galeri" },
  { label: "Tentang", href: "/tentang" },
  { label: "Kontak", href: "/kontak" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-xl text-dark">
              TEFA
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm font-medium transition-colors
                  ${pathname === link.href ? "text-sky-500" : "text-gray-600 hover:text-sky-500"}`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-sky-500 rounded-full transition-all
                    ${pathname === link.href ? "w-full" : "w-0 group-hover:w-full"}`}
                />
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
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
                ${pathname === link.href ? "text-primary" : "text-gray-600 hover:text-primary"}`}
            >
              {link.label}
            </Link>
          ))}

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

        </div>
      )}
    </nav>
  );
}