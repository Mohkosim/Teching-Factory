import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const UNVERIFIED_ACCOUNT_MAX_AGE_HOURS = 24;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - UNVERIFIED_ACCOUNT_MAX_AGE_HOURS * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: { role: "User", isVerified: false, createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ deletedCount: result.count });
}