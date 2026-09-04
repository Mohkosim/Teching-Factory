import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tentangSchema } from "@/lib/validations/tentang";
import { uploadMultipleFilesToCloudinary } from "@/lib/upload/cloudinary";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per gambar
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

    // Validasi file: jumlah, tipe, dan ukuran — sebelum apapun ditulis ke disk
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
    }

    // Upload ke Cloudinary (menggantikan writeFile ke disk lokal — tidak bisa dipakai di Netlify)
    const uploadedUrls: string[] =
      validFiles.length > 0
        ? await uploadMultipleFilesToCloudinary(validFiles, "tentang")
        : [];

    // Cari record existing (singleton) atau buat baru
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