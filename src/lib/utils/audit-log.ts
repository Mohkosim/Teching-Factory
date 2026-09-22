import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type AuditAction =
    | "change-email"
    | "reset-password"
    | "toggle-status"
    | "delete-account"
    | "upgrade-role";

export async function recordAuditLog(params: {
    actorId: string;
    actorName: string;
    action: AuditAction;
    targetUserId: string;
    targetName: string;
    detail?: Record<string, unknown>;
}): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                actorId: params.actorId,
                actorName: params.actorName,
                action: params.action,
                targetUserId: params.targetUserId,
                targetName: params.targetName,
                detail: params.detail as Prisma.InputJsonValue | undefined,
            },
        });
    } catch (error) {
        console.error("Gagal mencatat audit log:", error);
    }
}