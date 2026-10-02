import { prisma } from "@/lib/prisma";

export async function bersihkanPendaftaranSmkKedaluwarsa(): Promise<void> {
    try {
        const kandidat = await prisma.pengajuanMitraSMK.findMany({
            where: {
                status: "MenungguVerifikasiEmail",
                user: { isVerified: false, otpExpiresAt: { lt: new Date() } },
            },
            select: { user_id: true },
        });

        if (kandidat.length === 0) return;

        const userIds = [...new Set(kandidat.map((k) => k.user_id))];

        await prisma.user.deleteMany({
            where: { user_id: { in: userIds }, isVerified: false },
        });
    } catch (error) {
        console.error("Gagal membersihkan pendaftaran SMK kedaluwarsa:", error);
    }
}
