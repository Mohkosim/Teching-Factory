import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileToCloudinary, deleteFileFromCloudinary } from "@/lib/upload/cloudinary";

const MAX_FOTO = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const produkId = formData.get("produkId")?.toString();
    const orderDetailId = formData.get("orderDetailId")?.toString();
    const rating = Number(formData.get("rating"));
    const komentar = formData.get("komentar")?.toString() ?? "";
    const fotoFiles = formData.getAll("foto").filter((f): f is File => f instanceof File && f.size > 0);

    const keepFotoIdsRaw = formData.get("keepFotoIds");
    const keepFotoIds: string[] | null = keepFotoIdsRaw ? JSON.parse(keepFotoIdsRaw.toString()) : null;

    if (!produkId || !orderDetailId || !rating) {
        return NextResponse.json({ message: "Data tidak lengkap" }, { status: 400 });
    }

    const orderDetail = await prisma.order_Detail.findUnique({
        where: { order_detail_id: orderDetailId },
        include: { order: { select: { user_id: true } } },
    });
    if (!orderDetail || orderDetail.order.user_id !== session.user.id) {
        return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const existing = await prisma.review.findUnique({
        where: { order_detail_id: orderDetailId },
        include: { foto: true },
    });

    // Validasi total foto: (foto lama yang dipertahankan) + (foto baru) <= MAX_FOTO
    const jumlahLamaDipertahankan = existing
        ? keepFotoIds === null
            ? existing.foto.length
            : existing.foto.filter((f) => keepFotoIds.includes(f.foto_id)).length
        : 0;
    if (jumlahLamaDipertahankan + fotoFiles.length > MAX_FOTO) {
        return NextResponse.json({ message: `Maksimal ${MAX_FOTO} foto` }, { status: 400 });
    }
    for (const file of fotoFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ message: "Format foto harus JPG, PNG, atau WEBP" }, { status: 400 });
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ message: "Ukuran tiap foto maksimal 5MB" }, { status: 400 });
        }
    }

    const review = existing
        ? await prisma.review.update({
            where: { review_id: existing.review_id },
            data: { rating, komentar },
        })
        : await prisma.review.create({
            data: { produk_id: produkId, order_detail_id: orderDetailId, user_id: session.user.id, rating, komentar },
        });

    // ==== Hapus foto lama yang TIDAK ada di keepFotoIds ====
    if (existing && keepFotoIds !== null) {
        const fotoDihapus = existing.foto.filter((f) => !keepFotoIds.includes(f.foto_id));
        if (fotoDihapus.length > 0) {
            await prisma.fotoReview.deleteMany({
                where: { foto_id: { in: fotoDihapus.map((f) => f.foto_id) } },
            });
            await Promise.all(
                fotoDihapus.map(async (f) => {
                    try {
                        await deleteFileFromCloudinary(f.url);
                    } catch {
                    }
                })
            );
        }
    }

    // ==== Tambah foto baru ====
    if (fotoFiles.length > 0) {
        const fotoUrls = await Promise.all(
            fotoFiles.map((file) => uploadFileToCloudinary(file, "reviews"))
        );

        await prisma.fotoReview.createMany({
            data: fotoUrls.map((url) => ({ review_id: review.review_id, url })),
        });
    }

    const semuaFoto = await prisma.fotoReview.findMany({
        where: { review_id: review.review_id },
        select: { foto_id: true, url: true },
    });

    return NextResponse.json({ ...review, foto: semuaFoto });
}