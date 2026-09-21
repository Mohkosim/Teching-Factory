import { NextResponse } from "next/server";
import { getOtpMaxSendsPerDay } from "@/lib/utils/otp";
import type { IssueOtpResult } from "@/lib/utils/otp-issue";

export function otpIssueErrorResponse(
  result: Exclude<IssueOtpResult, { ok: true }>,
  now: Date = new Date()
) {
  if (result.reason === "cooldown") {
    return NextResponse.json(
      { message: `Tunggu ${result.retryAfterSeconds} detik sebelum meminta kode baru` },
      { status: 429 }
    );
  }

  if (result.reason === "daily_limit") {
    const jam = Math.max(1, Math.ceil((result.retryAt.getTime() - now.getTime()) / 3_600_000));
    return NextResponse.json(
      {
        message: `Batas pengiriman kode hari ini sudah habis (maksimal ${getOtpMaxSendsPerDay()}x per 24 jam). Cek folder Spam di e-mail Anda, atau coba lagi sekitar ${jam} jam lagi.`,
      },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { message: "Permintaan sedang diproses, coba lagi sebentar lagi" },
    { status: 429 }
  );
}
