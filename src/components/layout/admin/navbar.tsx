"use client";

import { Menu, ChevronDown, LogOut, User } from "lucide-react";
import { MdAccountCircle } from "react-icons/md";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getProfilePath } from "@/lib/side-config";

interface NavbarProps {
    collapsed: boolean;
    onToggleSidebar: () => void;
}

export function Navbar({ collapsed, onToggleSidebar }: NavbarProps) {
    const { data: session, status } = useSession();
    const user = session?.user;
    const router = useRouter();

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
            {/* Toggle Sidebar */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="rounded-full hover:bg-white"
            >
                <Menu className="w-5 h-5 text-foreground" />
            </Button>

            {/* User Dropdown */}
            {status === "loading" ? (
                <div className="flex items-center gap-3">
                    <div className="text-right space-y-1">
                        <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                </div>
            ) : (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 cursor-pointer group outline-none select-none">
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
                        </div>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-md">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex items-center gap-3 py-1">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage
                                        src={user?.image ?? ""}
                                        alt={user?.name ?? "User"}
                                    />
                                    <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                                        {getInitials(user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col space-y-0.5">
                                    <p className="text-sm font-semibold text-foreground leading-tight">
                                        {user?.name ?? "Guest"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate max-w-36">
                                        {user?.email ?? "-"}
                                    </p>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="gap-2 cursor-pointer rounded-lg"
                            onClick={() => router.push(getProfilePath(user?.role))}
                        >
                            <User className="h-4 w-4 text-gray-500" />
                            <span>Profil</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="gap-2 cursor-pointer rounded-lg text-red-500 focus:text-red-500 focus:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Keluar</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </header>
    );
}