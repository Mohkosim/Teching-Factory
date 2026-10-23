import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tentangSchema } from "@/lib/validations/tentang";
import { uploadMultipleFilesToCloudinary } from "@/lib/upload/cloudinary";
import { requireRoleApi } from "@/lib/authz";
import { cekMagicBytes } from "@/lib/upload/validate-file";

const MAX_FILE_SIZE = 2 * 1024 * 1024; 
const MAX_FILES = 8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET() {
  try {
    const tentang = await prisma.tentangTefa.findFirst({
      include: { dokumentasi: { orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: tentang }, { status: 200 });
  } catch (error) {
    console.error("[TENTANG_GET]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRoleApi(["SuperAdmin"]);
  if ("error" in auth) return auth.error;

  try {
    const formData = await req.formData();

    const deskripsi = formData.get("deskripsi")?.toString() ?? "";
    const videoLink = formData.get("videoLink")?.toString() ?? "";
    const files = formData.getAll("files") as File[];

    const parsed = tentangSchema.safeParse({ deskripsi, videoLink });
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Data tidak valid",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validFiles = files.filter((f) => f instanceof File && f.size > 0);

    if (validFiles.length > MAX_FILES) {
      return NextResponse.json(
        { message: `Maksimal ${MAX_FILES} foto per unggahan` },
        { status: 400 }
      );
    }

    for (const file of validFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { message: "Tipe file tidak didukung. Gunakan JPG, PNG, atau WEBP" },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: `Ukuran file maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }
      if (!(await cekMagicBytes(file, ["jpeg", "png", "webp"]))) {
        return NextResponse.json({ message: "Isi file bukan gambar yang valid" }, { status: 400 });
      }
    }


    const uploadedUrls: string[] =
      validFiles.length > 0
        ? await uploadMultipleFilesToCloudinary(validFiles, "tentang")
        : [];

 
    const existing = await prisma.tentangTefa.findFirst();

    const tentang = existing
      ? await prisma.tentangTefa.update({
          where: { tentang_id: existing.tentang_id },
          data: {
            deskripsi: parsed.data.deskripsi,
            videoLink: parsed.data.videoLink || null,
            ...(uploadedUrls.length > 0 && {
              dokumentasi: {
                create: uploadedUrls.map((url) => ({ url })),
              },
            }),
          },
          include: { dokumentasi: { orderBy: { createdAt: "desc" } } },
        })
      : await prisma.tentangTefa.create({
          data: {
            deskripsi: parsed.data.deskripsi,
            videoLink: parsed.data.videoLink || null,
            dokumentasi: { create: uploadedUrls.map((url) => ({ url })) },
          },
          include: { dokumentasi: { orderBy: { createdAt: "desc" } } },
        });

    return NextResponse.json(
      { message: "Berhasil disimpan", data: tentang },
      { status: 200 }
    );
  } catch (error) {
    console.error("[TENTANG_POST]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}