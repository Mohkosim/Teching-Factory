"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaUserCircle } from "react-icons/fa";
import { Pencil, User, ShoppingBag } from "lucide-react";

const MENU_AKUN = [
  { label: "Profil", href: "/profile" },
  { label: "Alamat", href: "/profile/alamat" },
  { label: "Ubah password", href: "/profile/reset-password" },
];

interface ProfileSidebarProps {
  avatarPreview: string | null;
  onAvatarClick: () => void;
}

export default function ProfileSidebar({ avatarPreview, onAvatarClick }: ProfileSidebarProps) {
  const pathname = usePathname();

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
          <p className="text-sm font-bold text-gray-900">Nama Pengguna</p>
          <button
            type="button"
            onClick={onAvatarClick}
            className="text-xs text-sky-500 hover:text-sky-600 flex items-center gap-1 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Ubah Profile
          </button>
        </div>
      </div>

      <nav className="mt-4 space-y-4 text-sm">
        <div>
          <p className="flex items-center gap-2 font-bold text-gray-900 mb-2">
            <User className="w-4 h-4" />
            Akun Saya
          </p>
          <ul className="ml-6 space-y-1.5">
            {MENU_AKUN.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`transition-colors ${
                      active
                        ? "text-sky-500 font-semibold"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <Link href="/profile/pesanan" className="flex items-center gap-2 font-bold text-gray-900 hover:text-gray-700 transition-colors">
          <ShoppingBag className="w-4 h-4" />
          Pesanan Saya
        </Link>
      </nav>
    </aside>
  );
}