import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MetodePembayaran, StatusSettlementTransaksi } from "@/generated/prisma/enums";
import { uploadFileToCloudinary } from "@/lib/upload/cloudinary";

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

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.transaksi.findUnique({ where: { transaksi_id: id } });
    if (!existing || existing.order_id) {
        return NextResponse.json(
            { message: "Transaksi ini tidak bisa diedit dari sini" },
            { status: 403 }
        );
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
                nominal: nominalRaw > 0 ? nominalRaw : existing.nominal,
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

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.transaksi.findUnique({ where: { transaksi_id: id } });
    if (!existing || existing.order_id) {
        return NextResponse.json(
            { message: "Transaksi ini tidak bisa dihapus dari sini" },
            { status: 403 }
        );
    }

    try {
        await prisma.transaksi.delete({ where: { transaksi_id: id } });
        return NextResponse.json({ message: "Transaksi berhasil dihapus" });
    } catch (err) {
        console.error("Gagal hapus transaksi:", err);
        return NextResponse.json(
            { message: "Gagal menghapus transaksi" },
            { status: 500 }
        );
    }
}