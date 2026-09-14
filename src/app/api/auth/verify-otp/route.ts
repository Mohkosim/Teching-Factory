import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtpSchema } from "@/lib/validations/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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

    if (user.otpCode !== otp) {
      return NextResponse.json(
        { message: "Kode OTP salah" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpLastSentAt: null,
      },
    });

    return NextResponse.json(
      { message: "Verifikasi berhasil, silakan masuk" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}