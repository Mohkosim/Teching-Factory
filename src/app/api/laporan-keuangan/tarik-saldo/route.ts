import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSaldoJurusan } from "@/lib/data/laporan-keuangan";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user)
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan)
        return NextResponse.json({ message: "Jurusan tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const nominal = Number(body.nominal);
    const { nama_bank, nomor_rekening, atas_nama } = body;

    if (!nominal || nominal <= 0) {
        return NextResponse.json({ message: "Nominal tidak valid" }, { status: 400 });
    }
    if (!nama_bank || !nomor_rekening || !atas_nama) {
        return NextResponse.json({ message: "Data rekening belum lengkap" }, { status: 400 });
    }

    const { saldoTersedia } = await getSaldoJurusan(jurusan.jurusan_id);
    if (nominal > saldoTersedia) {
        return NextResponse.json(
            { message: "Nominal melebihi saldo yang tersedia" },
            { status: 400 }
        );
    }

    const penarikan = await prisma.penarikanSaldo.create({
        data: {
            jurusan_id: jurusan.jurusan_id,
            user_id: session.user.id,
            nominal,
            nama_bank,
            nomor_rekening,
            atas_nama,
            status: "Pending",
        },
    });

    return NextResponse.json({
        message: "Pengajuan tarik saldo berhasil dikirim, menunggu diproses",
        data: penarikan,
    });
}