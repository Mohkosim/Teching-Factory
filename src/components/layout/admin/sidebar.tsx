"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { getNavGroups, NavItem, Role } from "@/lib/config/nav-config";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  role: Role;
  profileComplete?: boolean;
}

const ALWAYS_UNLOCKED_GROUP = "UMUM";

export function Sidebar({ collapsed, role, profileComplete = true }: SidebarProps) {
  const pathname = usePathname();

  const params = useParams<{ smkSlug?: string; jurusanSlug?: string }>();

  const navGroups = getNavGroups(role, {
    smkSlug: params?.smkSlug,
    jurusanSlug: params?.jurusanSlug,
  });

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
  };

  return (
    <aside
      className={cn(
        "min-h-screen bg-white border-r border-border flex flex-col",
        collapsed ? "w-20" : "w-56"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "py-5 border-b border-transparent overflow-hidden flex items-center justify-center",
          collapsed ? "px-0" : "px-6"
        )}
      >
        {collapsed ? (
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-sky-500 text-white font-bold text-lg italic">
            T
          </div>
        ) : (
          <Image
            src="/img/LogoTefa.png"
            alt="Logo Tefa"
            width={150}
            height={80}
            className="object-contain w-auto h-auto"
            priority
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-5">
        {navGroups.map((group) => {
          const groupLocked = !profileComplete && group.label !== ALWAYS_UNLOCKED_GROUP;

          return (
            <div key={group.label} className={cn(collapsed && "pt-4 border-t border-border")}>
              {!collapsed && (
                <p className="text-[10px] font-bold text-muted-foreground tracking-widest px-3 mb-2">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;

                  if (groupLocked) {
                    return (
                      <li key={item.href}>
                        <div
                          title={
                            collapsed
                              ? `${item.label} (Lengkapi profil terlebih dahulu)`
                              : "Lengkapi profil terlebih dahulu"
                          }
                          aria-disabled="true"
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                            "text-gray-300 cursor-not-allowed select-none",
                            collapsed && "justify-center"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {!collapsed && (
                            <span className="flex items-center gap-1.5 truncate">
                              {item.label}
                              <Lock className="w-3 h-3 shrink-0" />
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          collapsed && "justify-center",
                          active
                            ? "bg-sky-500 text-primary-foreground shadow-sm"
                            : "text-sky-500 hover:bg-sky-500 hover:text-white"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!collapsed && item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
