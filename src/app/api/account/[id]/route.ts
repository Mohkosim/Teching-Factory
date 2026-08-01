import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SuperAdmin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { action } = (await req.json()) as {
        action: "upgrade-role" | "toggle-status";
    };

    try {
        const account = await prisma.user.findUnique({ where: { user_id: id } });
        if (!account) {
            return NextResponse.json({ message: "Akun tidak ditemukan" }, { status: 404 });
        }

        if (action === "upgrade-role") {
            const updated = await prisma.user.update({
                where: { user_id: id },
                data: { role: "AdminSMK" },
            });
            return NextResponse.json({
                message: "Role berhasil diubah menjadi Admin SMK",
                data: updated,
            });
        }

        if (action === "toggle-status") {
            const updated = await prisma.user.update({
                where: { user_id: id },
                data: { isActive: !account.isActive },
            });
            return NextResponse.json({
                message: updated.isActive
                    ? "Akun berhasil diaktifkan"
                    : "Akun berhasil dinonaktifkan",
                data: updated,
            });
        }

        return NextResponse.json({ message: "Action tidak valid" }, { status: 400 });
    } catch (error) {
        console.error("PATCH /api/account/[id] error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SuperAdmin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        await prisma.user.delete({ where: { user_id: id } });
        return NextResponse.json({ message: "Akun berhasil dihapus" });
    } catch (error) {
        console.error("DELETE /api/account/[id] error:", error);
        return NextResponse.json({ message: "Gagal menghapus akun" }, { status: 500 });
    }
}