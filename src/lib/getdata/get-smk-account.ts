import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { SMKAccount } from "@/types/interfaces/accountAdmin";

export async function getSMKAccounts(): Promise<SMKAccount[]> {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SuperAdmin") {
        redirect("/login");
    }

    const users = await prisma.user.findMany({
        where: {
            role: { in: ["User", "AdminSMK", "AdminJurusan"] },
        },
        orderBy: { createdAt: "desc" },
        include: {
            smk: true,
        },
    });

    const accounts: SMKAccount[] = users.map((u) => ({
        user_id: u.user_id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? null,
        img: u.img ?? null,
        role: u.role,
        isActive: u.isActive,
        smk_id: u.smk?.smk_id ?? null,
        kepala_sekolah: u.smk?.kepala_sekolah ?? null,
        alamat: u.smk?.alamat ?? null,
        kota: u.smk?.kota ?? null,
        provinsi: u.smk?.provinsi ?? null,
        status_verifikasi: u.smk?.status_verifikasi ?? null,
    }));

    return accounts;
}