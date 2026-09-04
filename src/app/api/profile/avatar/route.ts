import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBase64ToCloudinary } from "@/lib/upload/cloudinary";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { base64 } = await req.json();
    if (!base64 || typeof base64 !== "string") {
        return NextResponse.json({ message: "File tidak valid" }, { status: 400 });
    }

    const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
        return NextResponse.json({ message: "Format file tidak valid" }, { status: 400 });
    }

    const mime = matches[1];
    const data = matches[2];

    if (!ALLOWED_MIME.includes(mime)) {
        return NextResponse.json({ message: "Tipe file tidak diizinkan" }, { status: 400 });
    }

    const buffer = Buffer.from(data, "base64");

    if (buffer.length > MAX_SIZE) {
        return NextResponse.json({ message: "FileTooLarge" }, { status: 413 });
    }

    const url = await uploadBase64ToCloudinary(base64, "avatars");

    return NextResponse.json({ url });
}