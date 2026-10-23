import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFileToCloudinary } from "@/lib/upload/cloudinary";
import { cekMagicBytes } from "@/lib/upload/validate-file";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminSMK", "AdminJurusan"].includes(session.user.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const fileRaw = formData.get("file");
    const file = fileRaw instanceof File ? fileRaw : null;

    if (!file) {
        return NextResponse.json({ message: "Tidak ada file yang diunggah" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ message: "FileTipeSalah" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ message: "FileTooLarge" }, { status: 400 });
    }
    if (!(await cekMagicBytes(file, ["jpeg", "png", "webp"]))) {
        return NextResponse.json({ message: "FileTipeSalah" }, { status: 400 });
    }

    const url = await uploadFileToCloudinary(file, "galeri");

    return NextResponse.json({ url });
}