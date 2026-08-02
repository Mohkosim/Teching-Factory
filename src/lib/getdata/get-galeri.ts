import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { GaleriItem } from "@/types/interfaces/galeri";

export async function getGaleriList(): Promise<GaleriItem[]> {
    const session = await getServerSession(authOptions);
    if (!session || !["AdminSMK", "AdminJurusan"].includes(session.user.role)) {
        redirect("/login");
    }

    const galeriList = await prisma.galeri.findMany({
        where: { user_id: session.user.id },
        orderBy: { createdAt: "desc" },
    });

    return galeriList;
}