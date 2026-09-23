import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStatusProduk } from "@/lib/utils/status-produk";
import { z } from "zod";

const stokSchema = z.object({
    stok: z.coerce.number().min(0, "Stok tidak boleh negatif").optional(),
    kombinasi: z
        .array(
            z.object({
                kombinasi_id: z.string().min(1),
                stok: z.coerce.number().min(0, "Stok tidak boleh negatif"),
            })
        )
        .optional(),
}).refine((d) => d.stok !== undefined || (d.kombinasi && d.kombinasi.length > 0), {
    message: "Data stok tidak valid",
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

    const { kombinasi } = parsed.data;

    try {

        if (kombinasi && kombinasi.length > 0) {
            const milikProduk = await prisma.varianKombinasi.findMany({
                where: { produk_id: id, kombinasi_id: { in: kombinasi.map((k) => k.kombinasi_id) } },
                select: { kombinasi_id: true },
            });
            if (milikProduk.length !== kombinasi.length) {
                return NextResponse.json(
                    { message: "Ada kombinasi varian yang tidak ditemukan untuk produk ini" },
                    { status: 400 }
                );
            }

            const updated = await prisma.$transaction(async (tx) => {
                for (const k of kombinasi) {
                    await tx.varianKombinasi.update({
                        where: { kombinasi_id: k.kombinasi_id },
                        data: { stok: k.stok },
                    });
                }

                const totalStok = await tx.varianKombinasi.aggregate({
                    where: { produk_id: id, aktif: true },
                    _sum: { stok: true },
                });
                const stokBaru = totalStok._sum.stok ?? 0;
                const statusBaru = computeStatusProduk(
                    stokBaru,
                    produk.status === "Nonaktif" ? "Nonaktif" : "Tersedia"
                );

                if (produk.barang[0]) {
                    await tx.barang.update({
                        where: { barang_id: produk.barang[0].barang_id },
                        data: { stok: stokBaru },
                    });
                } else {
                    await tx.barang.create({
                        data: { produk_id: id, stok: stokBaru, kondisi: "Baru" },
                    });
                }

                return tx.produk.update({
                    where: { produk_id: id },
                    data: { status: statusBaru },
                    include: { barang: true },
                });
            });

            return NextResponse.json({ message: "Stok varian berhasil diperbarui", data: updated });
        }

        const stok = parsed.data.stok as number;
        const statusBaru = computeStatusProduk(
            stok,
            produk.status === "Nonaktif" ? "Nonaktif" : "Tersedia"
        );

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

