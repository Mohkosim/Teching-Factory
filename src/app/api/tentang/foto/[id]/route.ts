import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const foto = await prisma.tentangTefaFoto.delete({
      where: { foto_id: id },
    });

    // Hapus file fisik (best-effort, jangan gagalkan request kalau file udah nggak ada)
    try {
      const filePath = path.join(process.cwd(), "public", foto.url);
      await unlink(filePath);
    } catch {
      // ignore
    }

    return NextResponse.json({ message: "Foto dihapus" }, { status: 200 });
  } catch (error) {
    console.error("[TENTANG_FOTO_DELETE]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}