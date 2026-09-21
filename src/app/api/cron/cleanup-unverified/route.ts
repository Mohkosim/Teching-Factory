import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// const UNVERIFIED_ACCOUNT_MAX_AGE_HOURS = 24;
const UNVERIFIED_ACCOUNT_MAX_AGE_HOURS =
  Number(process.env.UNVERIFIED_MAX_AGE_HOURS) > 0
    ? Number(process.env.UNVERIFIED_MAX_AGE_HOURS)
    : 24;

function isAuthorized(authHeader: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authHeader ?? "");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { message: "CRON_SECRET belum diatur di environment variable" },
      { status: 503 }
    );
  }

  if (!isAuthorized(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - UNVERIFIED_ACCOUNT_MAX_AGE_HOURS * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: { role: "User", isVerified: false, createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ deletedCount: result.count });
}
