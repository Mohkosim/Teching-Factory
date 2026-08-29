"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface FavoritIds {
    produkIds: string[];
    jasaIds: string[];
}

export async function getFavoritIds(): Promise<FavoritIds> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { produkIds: [], jasaIds: [] };

    const favorites = await prisma.favorite.findMany({
        where: { userId: session.user.id },
        select: { produkId: true, jasaId: true },
    });

    return {
        produkIds: favorites
            .map((f: { produkId: string | null }) => f.produkId)
            .filter((v: string | null): v is string => v !== null),
        jasaIds: favorites
            .map((f: { jasaId: string | null }) => f.jasaId)
            .filter((v: string | null): v is string => v !== null),
    };
}