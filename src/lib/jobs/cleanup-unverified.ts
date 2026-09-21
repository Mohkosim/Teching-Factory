import { prisma } from "@/lib/prisma";

const DEFAULT_MAX_AGE_HOURS = 24;

export function getUnverifiedMaxAgeHours(): number {
  const fromEnv = Number(process.env.UNVERIFIED_MAX_AGE_HOURS);
  return fromEnv > 0 ? fromEnv : DEFAULT_MAX_AGE_HOURS;
}


export async function runCleanupUnverified(): Promise<{ deletedCount: number }> {
  const maxAgeHours = getUnverifiedMaxAgeHours();
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: { role: "User", isVerified: false, createdAt: { lt: cutoff } },
  });

  return { deletedCount: result.count };
}