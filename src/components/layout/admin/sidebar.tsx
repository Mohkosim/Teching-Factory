"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getNavGroups, Role } from "@/lib/config/nav-config";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  role: Role;
}

export function Sidebar({ collapsed, role }: SidebarProps) {
  const pathname = usePathname();
  const navGroups = getNavGroups(role);

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
        {navGroups.map((group) => (
          <div key={group.label} className={cn(collapsed && "pt-4 border-t border-border")}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest px-3 mb-2">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                        collapsed && "justify-center",
                        isActive
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
        ))}
      </nav>
    </aside>
  );
}