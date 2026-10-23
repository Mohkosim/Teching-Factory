import { prisma } from "@/lib/prisma";

interface StatusUser { aktif: boolean; role: string | null; at: number }
const cache = new Map<string, StatusUser>();
const TTL_MS = 30_000;

export async function getStatusUser(userId: string): Promise<{ aktif: boolean; role: string | null }> {
    const hit = cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit;

    const u = await prisma.user.findUnique({ where: { user_id: userId }, select: { isActive: true, role: true } });
    const status: StatusUser = { aktif: !!u?.isActive, role: u?.role ?? null, at: Date.now() };
    cache.set(userId, status);
    if (cache.size > 5000) cache.clear();
    return status;
}
