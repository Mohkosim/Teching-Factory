import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFileFromCloudinary } from "@/lib/upload/cloudinary";
import { requireRoleApi } from "@/lib/authz";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoleApi(["SuperAdmin"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const foto = await prisma.tentangTefaFoto.delete({
      where: { foto_id: id },
    });

    try {
      await deleteFileFromCloudinary(foto.url);
    } catch {
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