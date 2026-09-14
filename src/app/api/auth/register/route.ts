import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations/auth";
import { generateOtp, OTP_EXPIRY_MS } from "@/lib/utils/otp";
import { sendOtpEmail } from "@/lib/mail";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateEmailForRegistration } from "@/lib/utils/email-validation";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitResult = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { message: "Terlalu banyak percobaan daftar. Coba lagi beberapa menit lagi." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, email, password } = parsed.data;

    const emailError = await validateEmailForRegistration(email);
    if (emailError) {
      return NextResponse.json({ message: emailError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing && existing.isVerified) {
      return NextResponse.json(
        { message: "E-mail sudah terdaftar" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    if (existing && !existing.isVerified) {
      await prisma.user.update({
        where: { email },
        data: {
          name: username,
          password: hashedPassword,
          otpCode: otp,
          otpExpiresAt,
          otpLastSentAt: new Date(),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name: username,
          email,
          password: hashedPassword,
          role: "User",
          isVerified: false,
          otpCode: otp,
          otpExpiresAt,
          otpLastSentAt: new Date(),
        },
      });
    }

    try {
      await sendOtpEmail(email, otp);
    } catch (mailError) {
      console.error("Gagal mengirim email OTP:", mailError);
      return NextResponse.json(
        { message: "Akun dibuat, tapi gagal mengirim kode verifikasi. Coba kirim ulang di halaman verifikasi." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: "Akun berhasil dibuat, silakan verifikasi e-mail Anda" },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}