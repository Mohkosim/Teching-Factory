import { NextRequest, NextResponse } from "next/server";
import { uploadMultipleFilesToCloudinary } from "@/lib/upload/cloudinary";
import { requireRoleApi } from "@/lib/authz";
import { cekMagicBytes } from "@/lib/upload/validate-file";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

export async function POST(req: NextRequest) {
    const auth = await requireRoleApi(["AdminJurusan"]);
    if ("error" in auth) return auth.error;

    try {
        const formData = await req.formData();
        const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

        if (files.length === 0) {
            return NextResponse.json({ message: "Tidak ada file yang dikirim" }, { status: 400 });
        }
        if (files.length > MAX_FILES) {
            return NextResponse.json({ message: `Maksimal ${MAX_FILES} file per unggahan` }, { status: 400 });
        }

        for (const file of files) {
            if (file.type !== "application/pdf" || !(await cekMagicBytes(file, ["pdf"]))) {
                return NextResponse.json(
                    { message: `${file.name} harus berformat PDF yang valid` },
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

        const urls = await uploadMultipleFilesToCloudinary(files, "jasa/portofolio", "raw");

        return NextResponse.json({ urls });
    } catch (error) {
        console.error("POST /api/upload/portofolio error:", error);
        return NextResponse.json(
            { message: "Terjadi kesalahan saat mengupload portofolio" },
            { status: 500 }
        );
    }
}
