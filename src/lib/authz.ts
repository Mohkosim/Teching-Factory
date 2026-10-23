import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AppRole = "User" | "SuperAdmin" | "AdminSMK" | "AdminJurusan";

export class AuthzError extends Error {
    status: number;
    constructor(message: string, status = 403) {
        super(message);
        this.name = "AuthzError";
        this.status = status;
    }
}

export async function requireRoleApi(roles: AppRole[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) } as const;
    }
    if (!roles.includes(session.user.role as AppRole)) {
        return { error: NextResponse.json({ message: "Tidak diizinkan" }, { status: 403 }) } as const;
    }
    return { session } as const;
}

export async function requireRoleAction(roles: AppRole[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new AuthzError("Unauthorized", 401);
    if (!roles.includes(session.user.role as AppRole)) throw new AuthzError("Tidak diizinkan", 403);
    return session;
}

export async function getJurusanSession(userId: string) {
    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: userId } });
    if (!jurusan) throw new AuthzError("Jurusan tidak ditemukan", 404);
    return jurusan;
}

export async function pastikanOrderMilikJurusan(orderId: string, jurusanId: string) {
    const order = await prisma.order.findUnique({ where: { order_id: orderId }, select: { seller_jurusan_id: true } });
    if (!order) throw new AuthzError("Pesanan tidak ditemukan", 404);
    if (order.seller_jurusan_id) {
        if (order.seller_jurusan_id !== jurusanId) throw new AuthzError("Pesanan ini bukan milik jurusan Anda", 403);
        return;
    }

    const details = await prisma.order_Detail.findMany({
        where: { order_id: orderId },
        select: { produk: { select: { jurusan_id: true } } },
    });
    if (details.length === 0 || details.some((d) => d.produk.jurusan_id !== jurusanId)) {
        throw new AuthzError("Pesanan ini bukan milik jurusan Anda", 403);
    }
}
