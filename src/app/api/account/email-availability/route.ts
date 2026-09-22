import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    excludeUserId: z.string().optional(),
});


export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SuperAdmin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
        email: searchParams.get("email") ?? "",
        excludeUserId: searchParams.get("excludeUserId") ?? undefined,
    });

    if (!parsed.success) {
        return NextResponse.json({ message: "E-mail tidak valid" }, { status: 400 });
    }

    const { email, excludeUserId } = parsed.data;

    const existing = await prisma.user.findUnique({
        where: { email },
        select: { user_id: true },
    });

    const available = !existing || existing.user_id === excludeUserId;

    return NextResponse.json({ available });
}
