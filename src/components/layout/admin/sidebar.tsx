"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCog,
  Info,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "UMUM",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "MANAJEMEN",
    items: [
      {
        href: "/dashboard/manajemen-akun",
        label: "Manajemen Akun",
        icon: UserCog,
      },
      {
        href: "/dashboard/tentang-tefa",
        label: "Tentang Tefa",
        icon: Info,
      },
      {
        href: "/dashboard/kontak-masuk",
        label: "Kontak Masuk",
        icon: Mail,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-transparent">
        <span className="text-2xl font-bold text-foreground tracking-widest">
          LOGO
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-widest px-3 mb-2">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-primary hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}