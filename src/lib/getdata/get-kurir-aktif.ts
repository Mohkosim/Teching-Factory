import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { KurirAktifData } from "@/types/interfaces/kurir";

export async function getKurirAktifList(): Promise<KurirAktifData[]> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const user = await prisma.user.findUnique({
        where: { user_id: session.user.id },
        select: { jurusan: { select: { jurusan_id: true } } },
    });
    if (!user?.jurusan?.jurusan_id) return [];

    const kurirList = await prisma.kurirAktif.findMany({
        where: { jurusan_id: user.jurusan.jurusan_id },
        orderBy: { createdAt: "asc" },
    });

    return kurirList;
}