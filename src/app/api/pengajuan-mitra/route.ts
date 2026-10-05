import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/utils/audit-log";
import { bersihkanPendaftaranSmkKedaluwarsa } from "@/lib/utils/pengajuan-mitra-cleanup";
import { pengajuanMitraSchema } from "@/lib/validations/pengajuan-mitra";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "User") {
        return NextResponse.json(
            { message: "Akun ini sudah memiliki peran admin, tidak bisa mengajukan lagi" },
            { status: 400 }
        );
    }

    const body = await req.json();
    const parsed = pengajuanMitraSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid";
        return NextResponse.json({ message: firstError }, { status: 400 });
    }
    const data = parsed.data;

    const userId = session.user.id;

    const pengajuanBerjalan = await prisma.pengajuanMitraSMK.findFirst({
        where: { user_id: userId, status: "Menunggu" },
    });
    if (pengajuanBerjalan) {
        return NextResponse.json(
            { message: "Kamu masih punya pengajuan yang sedang diproses. Tunggu sampai diproses SuperAdmin." },
            { status: 400 }
        );
    }

    const npsnDipakai = await prisma.sMK.findUnique({ where: { npsn: data.npsn } });
    if (npsnDipakai) {
        return NextResponse.json(
            { message: "NPSN ini sudah terdaftar sebagai mitra SMK" },
            { status: 409 }
        );
    }

    const pengajuan = await prisma.pengajuanMitraSMK.create({
        data: {
            user_id: userId,
            namaSekolah: data.namaSekolah,
            npsn: data.npsn,
            namaPenanggungJawab: data.namaPenanggungJawab,
            noHpPenanggungJawab: data.noHpPenanggungJawab,
            status: "Menunggu",
        },
    });

    await recordAuditLog({
        actorId: userId,
        actorName: session.user.name ?? session.user.email ?? "User",
        action: "ajukan-mitra-smk",
        targetUserId: userId,
        targetName: data.namaSekolah,
        detail: { pengajuan_id: pengajuan.pengajuan_id, npsn: data.npsn },
    });

    return NextResponse.json(
        { message: "Pengajuan berhasil dikirim, menunggu persetujuan SuperAdmin", data: pengajuan },
        { status: 201 }
    );
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const status = req.nextUrl.searchParams.get("status");
    const statusFilter =
        status === "Menunggu" || status === "Disetujui" || status === "Ditolak" ? status : undefined;

    if (session.user.role === "SuperAdmin") {
        await bersihkanPendaftaranSmkKedaluwarsa();

        const data = await prisma.pengajuanMitraSMK.findMany({
            where: statusFilter
                ? { status: statusFilter }
                : { status: { not: "MenungguVerifikasiEmail" } },
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, email: true, phone: true } },
                diprosesOleh: { select: { name: true } },
            },
        });
        return NextResponse.json({ data });
    }

    const data = await prisma.pengajuanMitraSMK.findMany({
        where: { user_id: session.user.id },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data });
}
