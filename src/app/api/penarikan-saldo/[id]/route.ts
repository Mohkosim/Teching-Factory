import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/authz";

const STATUS_VALID = ["Pending", "Diproses", "Selesai", "Ditolak"] as const;

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireRoleApi(["SuperAdmin"]);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body.status;

    if (!STATUS_VALID.includes(status)) {
        return NextResponse.json({ message: "Status tidak valid" }, { status: 400 });
    }

    const existing = await prisma.penarikanSaldo.findUnique({ where: { penarikan_id: id } });
    if (!existing) {
        return NextResponse.json({ message: "Data penarikan tidak ditemukan" }, { status: 404 });
    }


    const TRANSISI: Record<string, readonly string[]> = {
        Pending: ["Diproses", "Selesai", "Ditolak"],
        Diproses: ["Selesai", "Ditolak"],
        Selesai: [],
        Ditolak: [],
    };
    if (existing.status !== status && !TRANSISI[existing.status].includes(status)) {
        return NextResponse.json(
            { message: `Status ${existing.status} tidak dapat diubah menjadi ${status}` },
            { status: 409 }
        );
    }

    const hasil = await prisma.penarikanSaldo.updateMany({
        where: { penarikan_id: id, status: existing.status },
        data: { status },
    });
    if (hasil.count === 0) {
        return NextResponse.json({ message: "Status sudah berubah, muat ulang halaman" }, { status: 409 });
    }

    return NextResponse.json({ message: "Status penarikan berhasil diperbarui" });
}