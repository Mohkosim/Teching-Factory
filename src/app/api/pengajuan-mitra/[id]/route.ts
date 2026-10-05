import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/utils/audit-log";
import { prosesPengajuanMitraSchema } from "@/lib/validations/pengajuan-mitra";
import { sendPengajuanMitraDitolakEmail } from "@/lib/mail";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "SuperAdmin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = prosesPengajuanMitraSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid";
        return NextResponse.json({ message: firstError }, { status: 400 });
    }
    const { action, catatanAdmin } = parsed.data;

    const pengajuan = await prisma.pengajuanMitraSMK.findUnique({ where: { pengajuan_id: id } });
    if (!pengajuan) {
        return NextResponse.json({ message: "Pengajuan tidak ditemukan" }, { status: 404 });
    }
    if (pengajuan.status !== "Menunggu") {
        return NextResponse.json({ message: "Pengajuan ini sudah diproses sebelumnya" }, { status: 400 });
    }

    const actorId = session.user.id;
    const actorName = session.user.name ?? session.user.email ?? "SuperAdmin";

    if (action === "reject") {
        const updated = await prisma.pengajuanMitraSMK.update({
            where: { pengajuan_id: id },
            data: {
                status: "Ditolak",
                catatanAdmin,
                diprosesOlehId: actorId,
                diprosesAt: new Date(),
            },
        });

        await recordAuditLog({
            actorId,
            actorName,
            action: "reject-mitra-smk",
            targetUserId: pengajuan.user_id,
            targetName: pengajuan.namaSekolah,
            detail: { pengajuan_id: id, catatanAdmin },
        });

        let emailTerkirim = true;
        try {
            const pemohon = await prisma.user.findUnique({
                where: { user_id: pengajuan.user_id },
                select: { email: true },
            });
            if (pemohon?.email) {
                await sendPengajuanMitraDitolakEmail(
                    pemohon.email,
                    pengajuan.namaSekolah,
                    catatanAdmin,
                    `${process.env.NEXTAUTH_URL}/profile/pengajuan-mitra`
                );
            }
        } catch (error) {
            emailTerkirim = false;
            console.error("Gagal mengirim e-mail penolakan pengajuan mitra:", error);
        }

        return NextResponse.json({
            message: emailTerkirim
                ? "Pengajuan ditolak, alasan sudah dikirim ke e-mail pemohon"
                : "Pengajuan ditolak, tetapi e-mail ke pemohon gagal terkirim",
            data: updated,
        });
    }

    const npsnDipakai = await prisma.sMK.findFirst({
        where: { npsn: pengajuan.npsn, NOT: { user_id: pengajuan.user_id } },
    });
    if (npsnDipakai) {
        return NextResponse.json(
            { message: "NPSN ini sudah terdaftar sebagai mitra SMK lain" },
            { status: 409 }
        );
    }

    const updated = await prisma.$transaction(async (tx) => {
        const pengajuanUpdated = await tx.pengajuanMitraSMK.update({
            where: { pengajuan_id: id },
            data: {
                status: "Disetujui",
                catatanAdmin,
                diprosesOlehId: actorId,
                diprosesAt: new Date(),
            },
        });

        await tx.user.update({
            where: { user_id: pengajuan.user_id },
            data: {
                role: "AdminSMK",
                name: pengajuan.namaSekolah,
                phone: pengajuan.noHpPenanggungJawab,
            },
        });

        await tx.sMK.upsert({
            where: { user_id: pengajuan.user_id },
            update: {
                npsn: pengajuan.npsn,
                nama_penanggung_jawab: pengajuan.namaPenanggungJawab,
                no_hp_penanggung_jawab: pengajuan.noHpPenanggungJawab,
            },
            create: {
                user_id: pengajuan.user_id,
                npsn: pengajuan.npsn,
                nama_penanggung_jawab: pengajuan.namaPenanggungJawab,
                no_hp_penanggung_jawab: pengajuan.noHpPenanggungJawab,
                alamat: "-",
                kota: "-",
                provinsi: "-",
            },
        });

        return pengajuanUpdated;
    });

    await recordAuditLog({
        actorId,
        actorName,
        action: "approve-mitra-smk",
        targetUserId: pengajuan.user_id,
        targetName: pengajuan.namaSekolah,
        detail: { pengajuan_id: id, npsn: pengajuan.npsn },
    });

    return NextResponse.json({
        message: "Pengajuan disetujui, akun sudah jadi Admin SMK",
        data: updated,
    });
}
