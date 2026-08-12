import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { ids, action } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "ids tidak valid" }, { status: 400 });
    }

    if (action === "markRead") {
      await prisma.pesan.updateMany({
        where: { pesan_id: { in: ids } },
        data: { isRead: true },
      });
    } else if (action === "delete") {
      await prisma.pesan.updateMany({
        where: { pesan_id: { in: ids } },
        data: { isDeleted: true },
      });
    } else {
      return NextResponse.json({ message: "Action tidak dikenal" }, { status: 400 });
    }

    return NextResponse.json({ message: "Berhasil diperbarui" }, { status: 200 });
  } catch (error) {
    console.error("[KONTAK_BULK_PATCH]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}