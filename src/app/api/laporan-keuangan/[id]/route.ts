import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MetodePembayaran, StatusSettlementTransaksi } from "@/generated/prisma/enums";
import { uploadFileToCloudinary } from "@/lib/upload/cloudinary";
import { requireRoleApi } from "@/lib/authz";
import { cekMagicBytes } from "@/lib/upload/validate-file";

function parseMetode(value: string | null): MetodePembayaran | undefined {
    if (value && (Object.values(MetodePembayaran) as string[]).includes(value)) {
        return value as MetodePembayaran;
    }
    return undefined;
}

function parseStatusSettlement(value: string | null): StatusSettlementTransaksi | undefined {
    if (value && (Object.values(StatusSettlementTransaksi) as string[]).includes(value)) {
        return value as StatusSettlementTransaksi;
    }
    return undefined;
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const auth = await requireRoleApi(["AdminJurusan"]);
    if ("error" in auth) return auth.error;

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: auth.session.user.id } });
    const existing = await prisma.transaksi.findUnique({ where: { transaksi_id: id } });

    if (!jurusan || !existing || existing.order_id || existing.jurusan_id !== jurusan.jurusan_id || existing.jenis_transaksi !== "Pengeluaran") {
        return NextResponse.json({ message: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json(
            { message: "Format data tidak valid" },
            { status: 400 }
        );
    }

    const nama = (formData.get("nama") as string) || existing.nama || "-";
    const kategori = (formData.get("kategori") as string) || existing.kategori || "Operasional";
    const deskripsi = (formData.get("deskripsi") as string) || "";
    const tanggal = formData.get("tanggal") as string | null;
    const nominalRaw = Number(formData.get("nominal"));
    const metode = parseMetode(formData.get("metode") as string | null);
    const statusSettlement = parseStatusSettlement(formData.get("status_settlement") as string | null);
    const file = formData.get("gambar") as File | null;

    let buktiUrl = existing.bukti ?? undefined;
    if (file && file.size > 0) {
        if (file.size > 5 * 1024 * 1024 || !(await cekMagicBytes(file, ["jpeg", "png", "webp"]))) {
            return NextResponse.json({ message: "Bukti harus berupa gambar JPG/PNG/WEBP maksimal 5MB" }, { status: 400 });
        }
        try {
            buktiUrl = await uploadFileToCloudinary(file, "pengeluaran");
        } catch (err) {
            console.error("Gagal menyimpan file bukti:", err);
            return NextResponse.json(
                { message: "Gagal mengunggah foto bukti" },
                { status: 500 }
            );
        }
    }

    try {
        const kodePembayaran = existing.kode_pembayaran ?? `PNG-${Date.now()}`;

        const updated = await prisma.transaksi.update({
            where: { transaksi_id: id },
            data: {
                nama,
                kategori,
                deskripsi,
                nominal: Number.isInteger(nominalRaw) && nominalRaw > 0 ? nominalRaw : existing.nominal,
                tanggal_transaksi: tanggal ? new Date(tanggal) : existing.tanggal_transaksi,
                metode: metode ?? existing.metode,
                status_settlement: statusSettlement ?? existing.status_settlement,
                bukti: buktiUrl,
                kode_pembayaran: kodePembayaran,
            },
        });

        return NextResponse.json({ message: "Transaksi berhasil diperbarui", data: updated });
    } catch (err) {
        console.error("Gagal update transaksi:", err);
        return NextResponse.json(
            { message: "Gagal memperbarui transaksi" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const auth = await requireRoleApi(["AdminJurusan"]);
    if ("error" in auth) return auth.error;

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: auth.session.user.id } });
    const existing = await prisma.transaksi.findUnique({ where: { transaksi_id: id } });
    if (!jurusan || !existing || existing.order_id || existing.jurusan_id !== jurusan.jurusan_id || existing.jenis_transaksi !== "Pengeluaran") {
        return NextResponse.json({ message: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    try {
        await prisma.transaksi.update({ where: { transaksi_id: id }, data: { deletedAt: new Date() } });
        return NextResponse.json({ message: "Transaksi berhasil dihapus" });
    } catch (err) {
        console.error("Gagal hapus transaksi:", err);
        return NextResponse.json(
            { message: "Gagal menghapus transaksi" },
            { status: 500 }
        );
    }
}