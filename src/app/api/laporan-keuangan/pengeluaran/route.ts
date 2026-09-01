import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MetodePembayaran, StatusSettlementTransaksi } from "@/generated/prisma/enums";

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

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user)
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan)
        return NextResponse.json({ message: "Jurusan tidak ditemukan" }, { status: 404 });

    const formData = await req.formData();
    const nama = (formData.get("nama") as string) || "-";
    const kategori = (formData.get("kategori") as string) || "Operasional";
    const deskripsi = (formData.get("deskripsi") as string) || "";
    const tanggal = formData.get("tanggal") as string | null;
    const nominal = Number(formData.get("nominal"));
    const metode = parseMetode(formData.get("metode") as string | null);
    const statusSettlement = parseStatusSettlement(formData.get("status_settlement") as string | null);
    const file = formData.get("gambar") as File | null;

    if (!nominal || nominal <= 0) {
        return NextResponse.json({ message: "Nominal tidak valid" }, { status: 400 });
    }

    let buktiUrl: string | undefined;
    if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadDir = path.join(process.cwd(), "public", "uploads", "pengeluaran");
        await mkdir(uploadDir, { recursive: true });
        const filename = `${Date.now()}-${file.name}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        buktiUrl = `/uploads/pengeluaran/${filename}`;
    }


    const kodePembayaran = `PNG-${Date.now()}`;

    const transaksi = await prisma.transaksi.create({
        data: {
            user_id: session.user.id,
            jurusan_id: jurusan.jurusan_id,
            jenis_transaksi: "Pengeluaran",
            nama,
            kategori,
            deskripsi,
            nominal,
            bukti: buktiUrl,
            tanggal_transaksi: tanggal ? new Date(tanggal) : new Date(),
            metode: metode,
            status_settlement: statusSettlement ?? "Selesai",
            kode_pembayaran: kodePembayaran,
        },
    });

    return NextResponse.json({ message: "Pengeluaran berhasil disimpan", data: transaksi });
}