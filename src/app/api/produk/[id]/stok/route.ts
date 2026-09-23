import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStatusProduk } from "@/lib/utils/status-produk";
import { z } from "zod";

const stokSchema = z.object({
    stok: z.coerce.number().min(0, "Stok tidak boleh negatif"),
});


export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = stokSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
            { status: 400 }
        );
    }

    const produk = await prisma.produk.findUnique({
        where: { produk_id: id },
        include: { jurusan: true, barang: true },
    });
    if (!produk || produk.jurusan.user_id !== session.user.id) {
        return NextResponse.json({ message: "Produk tidak ditemukan" }, { status: 404 });
    }

    const { stok } = parsed.data;
    // Kalau produk sedang "Nonaktif", itu tetap menang. Selain itu, endpoint ini
    // hanya mengelola stok — jadi status yang "diminta" default-nya "Tersedia",
    // dan computeStatusProduk yang menentukan jadi "Habis" kalau stok 0 lagi.
    const statusBaru = computeStatusProduk(
        stok,
        produk.status === "Nonaktif" ? "Nonaktif" : "Tersedia"
    );

    try {
        const updated = await prisma.$transaction(async (tx) => {
            if (produk.barang[0]) {
                await tx.barang.update({
                    where: { barang_id: produk.barang[0].barang_id },
                    data: { stok },
                });
            } else {
                await tx.barang.create({
                    data: { produk_id: id, stok, kondisi: "Baru" },
                });
            }

            return tx.produk.update({
                where: { produk_id: id },
                data: { status: statusBaru },
                include: { barang: true },
            });
        });

        return NextResponse.json({ message: "Stok berhasil diperbarui", data: updated });
    } catch (error) {
        console.error("PATCH /api/produk/[id]/stok error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}
