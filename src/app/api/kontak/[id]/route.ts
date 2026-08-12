import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const pesan = await prisma.pesan.update({
      where: { pesan_id: id },
      data: {
        ...(typeof body.isFavorite === "boolean" && { isFavorite: body.isFavorite }),
        ...(typeof body.isRead === "boolean" && { isRead: body.isRead }),
      },
    });

    return NextResponse.json(
      { message: "Berhasil diperbarui", data: pesan },
      { status: 200 }
    );
  } catch (error) {
    console.error("[KONTAK_ID_PATCH]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}