import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const PESANAN_PATH = "/profile/pesanan";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB, video butuh lebih besar dari foto
const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/webp",
    "video/mp4", "video/quicktime", "video/webm",
];

async function simpanBuktiKeDisk(file: File): Promise<{ url: string; tipe: "Foto" | "Video" }> {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || (file.type.startsWith("video") ? "mp4" : "jpg");
    const namaFile = `${randomUUID()}.${ext}`;
    const folder = path.join(process.cwd(), "public", "uploads", "refund");
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, namaFile), bytes);

    return {
        url: `/uploads/refund/${namaFile}`,
        tipe: file.type.startsWith("video") ? "Video" : "Foto",
    };
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Silakan login terlebih dahulu" }, { status: 401 });
    }

    const formData = await req.formData();
    const order_id = String(formData.get("orderId") ?? "");
    const alasan = String(formData.get("alasan") ?? "").trim();
    const deskripsi = String(formData.get("deskripsi") ?? "").trim();
    const files = formData.getAll("bukti").filter((f): f is File => f instanceof File && f.size > 0);

    if (!order_id) {
        return NextResponse.json({ message: "Order tidak valid" }, { status: 400 });
    }
    if (!alasan) {
        return NextResponse.json({ message: "Alasan refund wajib diisi" }, { status: 400 });
    }
    if (!deskripsi) {
        return NextResponse.json({ message: "Deskripsi wajib diisi" }, { status: 400 });
    }
    if (files.length === 0) {
        return NextResponse.json({ message: "Minimal 1 bukti foto/video wajib diunggah" }, { status: 400 });
    }

    for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ message: `Format file ${file.name} tidak didukung` }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ message: `Ukuran file ${file.name} maksimal 20MB` }, { status: 400 });
        }
    }

    const order = await prisma.order.findUnique({
        where: { order_id },
        include: { refundRequest: true },
    });

    if (!order || order.user_id !== session.user.id) {
        return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
    }
    if (order.status_pembayaran !== "Lunas") {
        return NextResponse.json(
            { message: "Refund hanya bisa diajukan untuk pesanan yang sudah dibayar" },
            { status: 400 }
        );
    }
    if (order.refundRequest) {
        return NextResponse.json(
            { message: "Pesanan ini sudah pernah mengajukan refund" },
            { status: 400 }
        );
    }

    const buktiUploaded = await Promise.all(files.map((f) => simpanBuktiKeDisk(f)));

    const refund = await prisma.refundRequest.create({
        data: {
            order_id,
            user_id: session.user.id,
            alasan,
            deskripsi,
            bukti: { create: buktiUploaded.map((b) => ({ url: b.url, tipe: b.tipe })) },
        },
    });

    revalidatePath(PESANAN_PATH);

    return NextResponse.json({ refund_id: refund.refund_id }, { status: 201 });
}