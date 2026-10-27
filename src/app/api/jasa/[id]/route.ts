import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hapusAtauArsipkanProduk } from "@/lib/order/arsip-produk";
import { jasaSchema } from "@/lib/validations/jasa";
import { daftarBerbeda, statusPublikasiSetelahEdit, teksBerbeda } from "@/lib/utils/validasi-ulang";

async function assertOwnedByAdminJurusan(jasaId: string, userId: string) {
    const jasa = await prisma.jasa.findUnique({
        where: { jasa_id: jasaId },
        include: { produk: { include: { jurusan: true, foto: true } } },
    });
    if (!jasa || jasa.produk.jurusan.user_id !== userId) return null;
    return jasa;
}

async function assertOwnedByAdminSMK(jasaId: string, userId: string) {
    const jasa = await prisma.jasa.findUnique({
        where: { jasa_id: jasaId },
        include: { produk: { include: { jurusan: { include: { smk: true } } } } },
    });
    if (!jasa || jasa.produk.jurusan.smk.user_id !== userId) return null;
    return jasa;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const jasa = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!jasa) {
        return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(jasa);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.action === "publikasi" || body.action === "revisi") {
        if (session.user.role !== "AdminSMK") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const jasa = await assertOwnedByAdminSMK(id, session.user.id);
        if (!jasa) {
            return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
        }

        if (body.action === "publikasi") {
            const updated = await prisma.produk.update({
                where: { produk_id: jasa.produk_id },
                data: { status_publikasi: "Published", catatan_revisi: null },
            });
            return NextResponse.json({ message: "Jasa berhasil dipublikasikan", data: updated });
        }

        if (!body.catatan_revisi || typeof body.catatan_revisi !== "string") {
            return NextResponse.json({ message: "Catatan revisi wajib diisi" }, { status: 400 });
        }

        const updated = await prisma.produk.update({
            where: { produk_id: jasa.produk_id },
            data: { status_publikasi: "Revisi", catatan_revisi: body.catatan_revisi },
        });
        return NextResponse.json({ message: "Catatan revisi berhasil dikirim", data: updated });
    }

    if (session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = jasaSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
    }

    const jasa = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!jasa) {
        return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
    }

    const {
        nama_jasa, deskripsi, harga, status,
        estimasi_pengerjaan, minimal_dp_persen, kapasitas_harian, fotos,
    } = parsed.data;

    const infoInti = {
        berubah:
            teksBerbeda(jasa.produk.nama_produk, nama_jasa) ||
            teksBerbeda(jasa.nama_jasa, nama_jasa) ||
            teksBerbeda(jasa.produk.deskripsi, deskripsi) ||
            teksBerbeda(jasa.estimasi_pengerjaan, estimasi_pengerjaan) ||
            jasa.produk.harga !== harga ||
            jasa.minimal_dp_persen !== minimal_dp_persen ||
            daftarBerbeda(jasa.produk.foto.map((f) => f.url), fotos),
    };
    const statusPublikasiBaru = statusPublikasiSetelahEdit(jasa.produk.status_publikasi, infoInti);
    const perluValidasiUlang = jasa.produk.status_publikasi === "Published" && statusPublikasiBaru === "Pending";

    try {
        const updated = await prisma.$transaction(async (tx) => {
            await tx.produk.update({
                where: { produk_id: jasa.produk_id },
                data: {
                    nama_produk: nama_jasa, deskripsi, harga, status,
                    ...(statusPublikasiBaru ? { status_publikasi: statusPublikasiBaru } : {}),
                },
            });

            const hasil = await tx.jasa.update({
                where: { jasa_id: id },
                data: {
                    nama_jasa, estimasi_pengerjaan, minimal_dp_persen,
                    ...(kapasitas_harian !== undefined ? { kapasitas_harian } : {}),
                },
            });

            await tx.fotoProduk.deleteMany({ where: { produk_id: jasa.produk_id } });
            await tx.fotoProduk.createMany({
                data: fotos.map((url) => ({ produk_id: jasa.produk_id, url })),
            });

            return hasil;
        });

        return NextResponse.json({
            message: perluValidasiUlang
                ? "Jasa berhasil diperbarui. Karena harga/informasi jasa berubah, jasa perlu divalidasi ulang oleh Admin SMK dan sementara tidak tampil di toko."
                : "Jasa berhasil diperbarui",
            perluValidasiUlang,
            data: updated,
        });
    } catch (error) {
        console.error("PATCH /api/jasa/[id] error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminJurusan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const jasa = await assertOwnedByAdminJurusan(id, session.user.id);
    if (!jasa) {
        return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
    }

    try {
        if ((await hapusAtauArsipkanProduk(jasa.produk_id)) === "diarsipkan") {
            return NextResponse.json({
                message: "Jasa sudah pernah dipesan sehingga dinonaktifkan (bukan dihapus) agar riwayat transaksi tetap utuh",
                archived: true,
            });
        }
        await prisma.portofolio.deleteMany({ where: { jasa_id: id } });
        await prisma.fotoProduk.deleteMany({ where: { produk_id: jasa.produk_id } });
        await prisma.jasa.delete({ where: { jasa_id: id } });
        await prisma.produk.delete({ where: { produk_id: jasa.produk_id } });
        return NextResponse.json({ message: "Jasa berhasil dihapus" });
    } catch (error) {
        console.error("DELETE /api/jasa/[id] error:", error);
        return NextResponse.json({ message: "Gagal menghapus jasa" }, { status: 500 });
    }
}