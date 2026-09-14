import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resendOtpSchema } from "@/lib/validations/auth";
import { generateOtp, OTP_EXPIRY_MS, OTP_RESEND_COOLDOWN_MS } from "@/lib/utils/otp";
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

    if (!user) {
      return NextResponse.json(
        { message: "Akun tidak ditemukan" },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { message: "Akun sudah terverifikasi, silakan masuk" },
        { status: 200 }
      );
    }

    if (
      user.otpLastSentAt &&
      Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      const sisaDetik = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000
      );
      return NextResponse.json(
        { message: `Tunggu ${sisaDetik} detik sebelum meminta kode baru` },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.user.update({
      where: { email },
      data: { otpCode: otp, otpExpiresAt, otpLastSentAt: new Date() },
    });

    await sendOtpEmail(email, otp);

    return NextResponse.json(
      { message: "Kode OTP baru sudah dikirim" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}