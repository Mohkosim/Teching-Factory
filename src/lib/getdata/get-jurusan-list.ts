import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getJurusanNames(): Promise<string[]> {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminSMK") return [];

    const smk = await prisma.sMK.findUnique({
        where: { user_id: session.user.id },
        include: { jurusans: true },
    });
    if (!smk) return [];

    return smk.jurusans.map((j) => j.nama_jurusan);
}