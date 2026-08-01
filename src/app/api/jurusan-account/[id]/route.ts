import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function assertOwnedByAdminSMK(jurusanId: string, smkUserId: string) {
    const jurusan = await prisma.jurusan.findUnique({
        where: { jurusan_id: jurusanId },
        include: { smk: true },
    });
    if (!jurusan || jurusan.smk.user_id !== smkUserId) return null;
    return jurusan;
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminSMK") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body as { action: "update-data" | "toggle-status" };

    try {
        const jurusan = await assertOwnedByAdminSMK(id, session.user.id);
        if (!jurusan) {
            return NextResponse.json({ message: "Data jurusan tidak ditemukan" }, { status: 404 });
        }

        if (action === "update-data") {
            const { nama_jurusan, deskripsi, kepala_jurusan } = body as {
                nama_jurusan?: string;
                deskripsi?: string;
                kepala_jurusan?: string;
            };

            const updated = await prisma.jurusan.update({
                where: { jurusan_id: id },
                data: { nama_jurusan, deskripsi, kepala_jurusan },
            });

            return NextResponse.json({ message: "Data jurusan berhasil diperbarui", data: updated });
        }

        if (action === "toggle-status") {
            const user = await prisma.user.findUnique({ where: { user_id: jurusan.user_id } });
            if (!user) {
                return NextResponse.json({ message: "Akun tidak ditemukan" }, { status: 404 });
            }

            const updatedUser = await prisma.user.update({
                where: { user_id: jurusan.user_id },
                data: { isActive: !user.isActive },
            });

            return NextResponse.json({
                message: updatedUser.isActive ? "Akun berhasil diaktifkan" : "Akun berhasil dinonaktifkan",
                data: { isActive: updatedUser.isActive },
            });
        }

        return NextResponse.json({ message: "Action tidak valid" }, { status: 400 });
    } catch (error) {
        console.error("PATCH /api/jurusan-account/[id] error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminSMK") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const jurusan = await assertOwnedByAdminSMK(id, session.user.id);
        if (!jurusan) {
            return NextResponse.json({ message: "Data jurusan tidak ditemukan" }, { status: 404 });
        }

        await prisma.jurusan.delete({ where: { jurusan_id: id } });
        await prisma.user.delete({ where: { user_id: jurusan.user_id } });

        return NextResponse.json({ message: "Akun jurusan berhasil dihapus" });
    } catch (error) {
        console.error("DELETE /api/jurusan-account/[id] error:", error);
        return NextResponse.json({ message: "Gagal menghapus akun jurusan" }, { status: 500 });
    }
}