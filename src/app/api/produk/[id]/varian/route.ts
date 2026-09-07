import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { simpanVarianSchema } from "@/lib/validations/varian";

async function assertOwnedByAdmin(produkId: string, userId: string, role: string) {
    const produk = await prisma.produk.findUnique({
        where: { produk_id: produkId },
        include: { jurusan: { include: { smk: true } } },
    });
    if (!produk) return null;

    if (role === "AdminJurusan" && produk.jurusan.user_id === userId) {
        return produk;
    }
    if (role === "AdminSMK" && produk.jurusan.smk.user_id === userId) {
        return produk;
    }
    return null;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "AdminJurusan" && session.user.role !== "AdminSMK")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const produk = await assertOwnedByAdmin(id, session.user.id, session.user.role);
    if (!produk) {
        return NextResponse.json({ message: "Produk tidak ditemukan" }, { status: 404 });
    }

    const grup = await prisma.varianGrup.findMany({
        where: { produk_id: id },
        include: { opsi: { orderBy: { urutan: "asc" } } },
        orderBy: { urutan: "asc" },
    });

    const kombinasi = await prisma.varianKombinasi.findMany({
        where: { produk_id: id },
        include: { opsi: { include: { opsi: true } } },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ grup, kombinasi });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "AdminJurusan" && session.user.role !== "AdminSMK")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const produk = await assertOwnedByAdmin(id, session.user.id, session.user.role);
    if (!produk) {
        return NextResponse.json({ message: "Produk tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = simpanVarianSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { message: parsed.error.issues[0]?.message ?? "Data varian tidak valid" },
            { status: 400 }
        );
    }

    const { grup, kombinasi } = parsed.data;

    try {
        await prisma.$transaction(async (tx) => {
            await tx.varianKombinasi.deleteMany({ where: { produk_id: id } });
            await tx.varianGrup.deleteMany({ where: { produk_id: id } });

            const opsiIdMap = new Map<string, string>();

            for (let i = 0; i < grup.length; i++) {
                const g = grup[i];
                const grupBaru = await tx.varianGrup.create({
                    data: { produk_id: id, nama: g.nama, urutan: i },
                });

                for (let j = 0; j < g.opsi.length; j++) {
                    const o = g.opsi[j];
                    const opsiBaru = await tx.varianOpsi.create({
                        data: { grup_id: grupBaru.grup_id, nama: o.nama, gambar: o.gambar, urutan: j },
                    });
                    opsiIdMap.set(`${g.nama}::${o.nama}`, opsiBaru.opsi_id);
                }
            }

            for (const k of kombinasi) {
                const opsiIds = k.opsi_nama.map((namaOpsi, idx) => {
                    const namaGrup = grup[idx]?.nama;
                    const opsiId = opsiIdMap.get(`${namaGrup}::${namaOpsi}`);
                    if (!opsiId) {
                        throw new Error(`Opsi "${namaOpsi}" pada grup "${namaGrup}" tidak ditemukan`);
                    }
                    return opsiId;
                });

                await tx.varianKombinasi.create({
                    data: {
                        produk_id: id,
                        harga: k.harga,
                        stok: k.stok,
                        sku: k.sku,
                        gambar: k.gambar,
                        opsi: { create: opsiIds.map((opsi_id) => ({ opsi_id })) },
                    },
                });
            }
        });

        const totalStokVarian = await prisma.varianKombinasi.aggregate({
            where: { produk_id: id, aktif: true },
            _sum: { stok: true },
        });

        if (kombinasi.length > 0) {
            await prisma.barang.updateMany({
                where: { produk_id: id },
                data: { stok: totalStokVarian._sum.stok ?? 0 },
            });
        }

        return NextResponse.json({ message: "Varian berhasil disimpan" });
    } catch (error) {
        console.error("POST /api/produk/[id]/varian error:", error);

        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code?: string }).code === "P2002"
        ) {
            return NextResponse.json(
                { message: "Ada nama grup atau opsi varian yang sama persis, mohon periksa kembali" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Terjadi kesalahan server" },
            { status: 500 }
        );
    }

}