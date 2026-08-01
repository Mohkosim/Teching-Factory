import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per gambar
const MAX_FILES = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
        return NextResponse.json({ message: "Tidak ada file yang diunggah" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
        return NextResponse.json({ message: `Maksimal ${MAX_FILES} gambar per produk` }, { status: 400 });
    }

    for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ message: "FileTipeSalah" }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ message: "FileTooLarge" }, { status: 400 });
        }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "produk");
    await mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
        const bytes = Buffer.from(await file.arrayBuffer());
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const filename = `${randomUUID()}.${ext}`;
        await writeFile(path.join(uploadDir, filename), bytes);
        urls.push(`/uploads/produk/${filename}`);
    }

    return NextResponse.json({ urls });
}