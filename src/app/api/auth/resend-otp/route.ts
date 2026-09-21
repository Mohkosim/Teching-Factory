import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resendOtpSchema } from "@/lib/validations/auth";
import { issueOtp, refundOtpSend } from "@/lib/utils/otp-issue";
import { otpIssueErrorResponse } from "@/lib/utils/otp-response";
import { REGISTRATION_COOKIE, matchesRegistrationKey } from "@/lib/utils/registration-key";
import { sendOtpEmail } from "@/lib/mail";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitResult = rateLimit(`resend-otp:${ip}`, 10, 15 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = resendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.isVerified) {
      return NextResponse.json(
        { message: "Akun sudah terverifikasi, silakan masuk" },
        { status: 200 }
      );
    }

    const cookieKey = req.cookies.get(REGISTRATION_COOKIE)?.value;
    if (!user || !matchesRegistrationKey(cookieKey, user.regKeyHash)) {
      return NextResponse.json(
        { message: "Sesi pendaftaran tidak valid. Silakan daftar ulang dari perangkat ini." },
        { status: 403 }
      );
    }

    const now = new Date();
    const issued = await issueOtp(user, {}, now);
    if (!issued.ok) {
      return otpIssueErrorResponse(issued, now);
    }

    try {
      await sendOtpEmail(email, issued.otp);
    } catch (mailError) {
      console.error("Gagal mengirim email OTP:", mailError);
      await refundOtpSend(user.user_id);
      return NextResponse.json(
        { message: "Gagal mengirim email, coba lagi beberapa saat lagi." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        message: "Kode OTP baru sudah dikirim",
        remainingToday: issued.remainingToday,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
