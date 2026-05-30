"use client";

import { Search, ChevronDown } from "lucide-react";
import { MdAccountCircle } from "react-icons/md";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";

export function Navbar() {
  const { data: session, status } = useSession();

  const user = session?.user;

  // Ambil inisial dari nama user
  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-20 border-b border-transparent flex items-center justify-between px-10">
      {/* Search */}
      <div className="relative w-75">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search here..."
          className="w-full pl-10 pr-4 py-2 bg-white rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
        />
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3 cursor-pointer group">
        {status === "loading" ? (
          // Skeleton loading
          <div className="flex items-center gap-3">
            <div className="text-right space-y-1">
              <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {user?.name ?? "Guest"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email ?? "-"}
              </p>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={user?.image ?? ""}
                alt={user?.name ?? "User"}
              />
              <AvatarFallback className="bg-primary/20 text-primary">
                <MdAccountCircle className="w-15 h-15" />
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
          </>
        )}
      </div>
    </header>
  );
}