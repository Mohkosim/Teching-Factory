"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaUserCircle } from "react-icons/fa";
import { Pencil, User, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MENU_AKUN = [
  { label: "Profil", href: "/profile" },
  { label: "Alamat", href: "/profile/alamat" },
  { label: "Ubah password", href: "/profile/reset-password" },
];

interface ProfileSidebarProps {
  avatarPreview: string | null;
  nama: string;
  loading?: boolean;
}

export default function ProfileSidebar({ avatarPreview, nama, loading = false }: ProfileSidebarProps) {
  const pathname = usePathname();

  if (loading) {
    return (
      <aside className="bg-white rounded-2xl shadow-sm p-5 h-fit">
        <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <ul className="ml-6 space-y-2.5">
              {MENU_AKUN.map((item) => (
                <li key={item.href}>
                  <Skeleton className="h-3 w-24" />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white rounded-2xl shadow-sm p-5 h-fit">
      <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center">
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Foto profil"
              width={48}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <FaUserCircle className="w-full h-full text-gray-300" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{nama || "Pengguna"}</p>
          <span className="text-xs text-sky-500 flex items-center gap-1">
            <Pencil className="w-3 h-3" />
            Ubah Profile
          </span>
        </div>
      </div>

      <nav className="mt-4 space-y-4 text-sm">
        <div>
          <p
            className={`flex items-center gap-2 font-bold mb-2 ${
              MENU_AKUN.some((item) => pathname === item.href)
                ? "text-sky-500"
                : "text-gray-900"
            }`}
          >
            <User className="w-4 h-4" />
            Akun Saya
          </p>
                    <ul className="ml-6 space-y-1.5">
            {MENU_AKUN.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href} className="flex items-center justify-between gap-1.5">
                  <Link
                    href={item.href}
                    className={`transition-colors ${active
                        ? "text-sky-500 font-semibold"
                        : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    {item.label}
                  </Link>
                  {active && <span className="w-1 h-1 rounded-full bg-sky-500 shrink-0 mr-2" />}
                </li>
              );
            })}
          </ul>
        </div>

        <Link
          href="/profile/pesanan"
          className={`flex items-center gap-2 font-bold transition-colors ${
            pathname === "/profile/pesanan"
              ? "text-sky-500"
              : "text-gray-900 hover:text-gray-700"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Pesanan Saya
        </Link>
      </nav>
    </aside>
  );
}