import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";
import { sendResetPasswordEmail, sendEmailChangedNotice } from "@/lib/mail";
import { recordAuditLog } from "@/lib/utils/audit-log";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
    newEmail: z.string().trim().toLowerCase().min(1, "E-mail wajib diisi").email("Format e-mail tidak valid"),
});


export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SuperAdmin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const limitResult = rateLimit(`change-email:${session.user.id}`, 20, 15 * 60 * 1000);
    if (!limitResult.success) {
        return NextResponse.json(
            { message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." },
            { status: 429 }
        );
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { message: parsed.error.issues[0].message },
            { status: 400 }
        );
    }
    const { newEmail } = parsed.data;

    try {
        const account = await prisma.user.findUnique({ where: { user_id: id } });
        if (!account) {
            return NextResponse.json({ message: "Akun tidak ditemukan" }, { status: 404 });
        }

        if (newEmail === account.email) {
            return NextResponse.json(
                { message: "E-mail baru sama dengan e-mail saat ini" },
                { status: 400 }
            );
        }

        const dipakaiAkunLain = await prisma.user.findUnique({ where: { email: newEmail } });
        if (dipakaiAkunLain) {
            return NextResponse.json(
                { message: "E-mail tersebut sudah dipakai akun lain" },
                { status: 409 }
            );
        }

        const oldEmail = account.email;
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 30);

        const updated = await prisma.user.update({
            where: { user_id: id },
            data: { email: newEmail, resetToken, resetTokenExpiry },
        });

        const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

        try {
            await sendResetPasswordEmail(newEmail, resetUrl);
        } catch (mailError) {

            console.error("Gagal mengirim link reset ke e-mail baru:", mailError);
            await recordAuditLog({
                actorId: session.user.id,
                actorName: session.user.name ?? session.user.email ?? "SuperAdmin",
                action: "change-email",
                targetUserId: id,
                targetName: account.name,
                detail: { oldEmail, newEmail, resetEmailFailed: true },
            });
            return NextResponse.json(
                {
                    message:
                        "E-mail berhasil diubah, tetapi gagal mengirim link atur ulang kata sandi ke e-mail baru. Gunakan menu Kirim Link Reset untuk mencoba lagi.",
                    data: { email: updated.email },
                },
                { status: 207 }
            );
        }


        try {
            await sendEmailChangedNotice(oldEmail, newEmail);
        } catch (mailError) {
            console.error("Gagal mengirim pemberitahuan ke e-mail lama:", mailError);
        }

        await recordAuditLog({
            actorId: session.user.id,
            actorName: session.user.name ?? session.user.email ?? "SuperAdmin",
            action: "change-email",
            targetUserId: id,
            targetName: account.name,
            detail: { oldEmail, newEmail },
        });

        return NextResponse.json({
            message: "E-mail berhasil diubah dan link atur ulang kata sandi telah dikirim",
            data: { email: updated.email },
        });
    } catch (error) {
        console.error("PATCH /api/account/[id]/email error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}
