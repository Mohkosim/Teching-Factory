import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  generateOtp,
  hashOtp,
  getOtpMaxSendsPerDay,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_SEND_WINDOW_MS,
} from "@/lib/utils/otp";

type OtpQuotaUser = {
  user_id: string;
  otpLastSentAt: Date | null;
  otpSendCount: number;
  otpWindowStartedAt: Date | null;
};

export type IssueOtpResult =
  | { ok: true; otp: string; remainingToday: number }
  | { ok: false; reason: "cooldown"; retryAfterSeconds: number }
  | { ok: false; reason: "daily_limit"; retryAt: Date }
  | { ok: false; reason: "conflict" };


export async function issueOtp(
  user: OtpQuotaUser,
  extraData: Prisma.UserUpdateManyMutationInput = {},
  now: Date = new Date()
): Promise<IssueOtpResult> {
  if (user.otpLastSentAt) {
    const elapsed = now.getTime() - user.otpLastSentAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: "cooldown",
        retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000),
      };
    }
  }

  const windowExpired =
    !user.otpWindowStartedAt ||
    now.getTime() - user.otpWindowStartedAt.getTime() >= OTP_SEND_WINDOW_MS;
  const currentCount = windowExpired ? 0 : user.otpSendCount;
  const max = getOtpMaxSendsPerDay();

  if (currentCount >= max) {
    return {
      ok: false,
      reason: "daily_limit",
      retryAt: new Date(user.otpWindowStartedAt!.getTime() + OTP_SEND_WINDOW_MS),
    };
  }

  const otp = generateOtp();

  const result = await prisma.user.updateMany({
    where: {
      user_id: user.user_id,
      otpSendCount: user.otpSendCount,
      otpWindowStartedAt: user.otpWindowStartedAt,
    },
    data: {
      ...extraData,
      otpCode: hashOtp(otp),
      otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
      otpLastSentAt: now,
      otpAttempts: 0,
      otpSendCount: currentCount + 1,
      otpWindowStartedAt: windowExpired ? now : user.otpWindowStartedAt,
    },
  });

  if (result.count === 0) {
    return { ok: false, reason: "conflict" };
  }

  return { ok: true, otp, remainingToday: max - (currentCount + 1) };
}

export async function refundOtpSend(userId: string): Promise<void> {
  try {
    await prisma.user.updateMany({
      where: { user_id: userId, otpSendCount: { gt: 0 } },
      data: { otpSendCount: { decrement: 1 }, otpLastSentAt: null },
    });
  } catch (error) {
    console.error("Gagal mengembalikan jatah kirim OTP:", error);
  }
}
