import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtpSchema } from "@/lib/validations/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { OTP_MAX_ATTEMPTS, otpMatches } from "@/lib/utils/otp";
import { createOtpLoginTicket } from "@/lib/utils/otp-login-ticket";
import {
  REGISTRATION_COOKIE,
  matchesRegistrationKey,
  clearRegistrationCookie,
} from "@/lib/utils/registration-key";

const INVALID_SESSION_MESSAGE =
  "Sesi pendaftaran tidak valid. Silakan daftar ulang dari perangkat ini.";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitResult = rateLimit(`verify-otp:${ip}`, 20, 15 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.isVerified) {
      return NextResponse.json(
        { message: "Akun sudah terverifikasi, silakan masuk" },
        { status: 200 }
      );
    }

    const cookieKey = req.cookies.get(REGISTRATION_COOKIE)?.value;
    if (!user || !matchesRegistrationKey(cookieKey, user.regKeyHash)) {
      return NextResponse.json({ message: INVALID_SESSION_MESSAGE }, { status: 403 });
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      return NextResponse.json(
        { message: "Belum ada kode OTP yang dikirim, minta kode baru" },
        { status: 400 }
      );
    }

    if (user.otpExpiresAt < new Date()) {
      return NextResponse.json(
        { message: "Kode OTP sudah kedaluwarsa, minta kode baru" },
        { status: 400 }
      );
    }

    const { otpAttempts } = await prisma.user.update({
      where: { user_id: user.user_id },
      data: { otpAttempts: { increment: 1 } },
      select: { otpAttempts: true },
    });

    if (otpAttempts > OTP_MAX_ATTEMPTS) {
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { otpCode: null, otpExpiresAt: null },
      });
      return NextResponse.json(
        { message: "Terlalu banyak kode salah. Kode dibatalkan, silakan minta kode baru." },
        { status: 429 }
      );
    }

    if (!otpMatches(otp, user.otpCode)) {
      const sisa = OTP_MAX_ATTEMPTS - otpAttempts;
      return NextResponse.json(
        {
          message:
            sisa > 0
              ? `Kode OTP salah (sisa ${sisa} percobaan)`
              : "Kode OTP salah. Percobaan habis, silakan minta kode baru.",
        },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpLastSentAt: null,
        otpAttempts: 0,
        regKeyHash: null,
      },
    });

    const loginTicket = await createOtpLoginTicket(user.user_id);

    const res = NextResponse.json(
      { message: "Verifikasi berhasil", loginTicket },
      { status: 200 }
    );
    clearRegistrationCookie(res);
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
