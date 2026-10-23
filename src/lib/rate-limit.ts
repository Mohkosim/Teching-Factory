import { prisma } from "@/lib/prisma";

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const resetAt = new Date(Date.now() + windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "reset_at")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count"    = CASE WHEN "RateLimit"."reset_at" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "reset_at" = CASE WHEN "RateLimit"."reset_at" < NOW() THEN ${resetAt} ELSE "RateLimit"."reset_at" END
      RETURNING "count", "reset_at"`;

    if (Math.random() < 0.01) {
      prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "reset_at" < NOW()`.catch(() => undefined);
    }

    const { count, reset_at } = rows[0];
    if (count > limit) {
      return { success: false, remaining: 0, retryAfterMs: Math.max(0, new Date(reset_at).getTime() - Date.now()) };
    }
    return { success: true, remaining: limit - count, retryAfterMs: 0 };
  } catch (err) {

    console.error("[rate-limit] gagal dicek, permintaan ditolak:", err);
    return { success: false, remaining: 0, retryAfterMs: 60_000 };
  }
}

export function getClientIp(req: Request): string {
  const headers = req.headers;

  const trusted = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (trusted) {
    return headers.get(trusted)?.split(",")[0].trim() || "unknown";
  }

  const platformIp =
    headers.get("cf-connecting-ip") ??
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-real-ip");
  if (platformIp) return platformIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}
