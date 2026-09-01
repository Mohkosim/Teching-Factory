import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// import { auth } from "@/auth";

const STATUS_VALID = ["Pending", "Diproses", "Selesai", "Ditolak"] as const;

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // const session = await auth();
    // if (session?.user?.role !== "SuperAdmin") {
    //     return NextResponse.json({ message: "Tidak diizinkan" }, { status: 403 });
    // }

    const { id } = await params;
    const body = await req.json();
    const status = body.status;

    if (!STATUS_VALID.includes(status)) {
        return NextResponse.json({ message: "Status tidak valid" }, { status: 400 });
    }

    const existing = await prisma.penarikanSaldo.findUnique({ where: { penarikan_id: id } });
    if (!existing) {
        return NextResponse.json({ message: "Data penarikan tidak ditemukan" }, { status: 404 });
    }

    await prisma.penarikanSaldo.update({
        where: { penarikan_id: id },
        data: { status },
    });

    return NextResponse.json({ message: "Status penarikan berhasil diperbarui" });
}