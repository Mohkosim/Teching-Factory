import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "portofolio");

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const files = formData.getAll("files") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ message: "Tidak ada file yang dikirim" }, { status: 400 });
        }

        // Validasi tipe & ukuran sebelum menyentuh disk
        for (const file of files) {
            if (file.type !== "application/pdf") {
                return NextResponse.json(
                    { message: `${file.name} harus berformat PDF` },
                    { status: 415 }
                );
            }
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { message: `${file.name} melebihi 5MB` },
                    { status: 413 }
                );
            }
        }

        await mkdir(UPLOAD_DIR, { recursive: true });

        const urls: string[] = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const extension = path.extname(file.name) || ".pdf";
            const fileName = `${randomUUID()}${extension}`;
            const filePath = path.join(UPLOAD_DIR, fileName);

            await writeFile(filePath, buffer);

            // URL publik yang bisa diakses langsung dari browser
            urls.push(`/uploads/portofolio/${fileName}`);
        }

        return NextResponse.json({ urls });
    } catch (error) {
        console.error("POST /api/upload/portofolio error:", error);
        return NextResponse.json(
            { message: "Terjadi kesalahan saat mengupload portofolio" },
            { status: 500 }
        );
    }
}