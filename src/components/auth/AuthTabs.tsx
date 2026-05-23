"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AuthTabs() {
    const pathname = usePathname();
    const isLogin = pathname === "/auth/login";

    const tabClass = (active: boolean) =>
        `flex-1 pb-3 text-sm font-semibold text-center transition-colors duration-200 ${active
            ? "text-gray-900 border-b-2 border-sky-500 -mb-px"
            : "text-gray-400 hover:text-gray-600"
        }`;

    return (
        <div className="flex border-b border-gray-200">
            <Link href="/auth/login" className={tabClass(isLogin)}>
                Masuk
            </Link>
            <Link href="/auth/register" className={tabClass(!isLogin)}>
                Daftar
            </Link>
        </div>
    );
}