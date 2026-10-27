import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { simpanVarianSchema } from "@/lib/validations/varian";
import { simpanVarian, VarianError } from "@/lib/varian/simpan-varian";
import { GRUP_VARIAN_TERLIHAT, OPSI_VARIAN_TERLIHAT } from "@/lib/varian/terlihat";

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

    // Kombinasi yang sudah diarsipkan (pernah dipesan lalu dibuang admin) tidak ditampilkan lagi.
    const grup = await prisma.varianGrup.findMany({
        where: { produk_id: id, ...GRUP_VARIAN_TERLIHAT },
        include: { opsi: { where: OPSI_VARIAN_TERLIHAT, orderBy: { urutan: "asc" } } },
        orderBy: { urutan: "asc" },
    });

    const kombinasi = await prisma.varianKombinasi.findMany({
        where: { produk_id: id, aktif: true },
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

    try {
        const hasil = await simpanVarian(id, parsed.data, {
            // Admin SMK adalah pihak yang memvalidasi, jadi hanya perubahan oleh Admin Jurusan yang memicu validasi ulang.
            validasiUlangJikaBerubah: session.user.role === "AdminJurusan",
        });

        return NextResponse.json({
            message: hasil.perluValidasiUlang
                ? "Varian berhasil disimpan. Karena harga/struktur varian berubah, produk perlu divalidasi ulang oleh Admin SMK dan sementara tidak tampil di toko."
                : "Varian berhasil disimpan",
            perluValidasiUlang: hasil.perluValidasiUlang,
        });
    } catch (error) {
        if (error instanceof VarianError) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }

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

        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}
