import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations/auth";
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from "@/lib/utils/otp";
import { issueOtp, refundOtpSend } from "@/lib/utils/otp-issue";
import { otpIssueErrorResponse } from "@/lib/utils/otp-response";
import {
  REGISTRATION_COOKIE,
  createRegistrationKey,
  matchesRegistrationKey,
  setRegistrationCookie,
} from "@/lib/utils/registration-key";
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

    const now = new Date();
    const hashedPassword = await bcrypt.hash(password, 10);
    const { key: registrationKey, hash: registrationKeyHash } = createRegistrationKey();

    let otp: string;
    let userId: string;

    if (existing) {
      const cookieKey = req.cookies.get(REGISTRATION_COOKIE)?.value;
      const sameDevice = matchesRegistrationKey(cookieKey, existing.regKeyHash);
      const otpStillValid = !!existing.otpExpiresAt && existing.otpExpiresAt > now;

      if (!sameDevice && otpStillValid) {
        return NextResponse.json(
          {
            message:
              "E-mail ini sedang menunggu verifikasi dari perangkat lain. Selesaikan verifikasinya, atau coba lagi setelah 10 menit.",
          },
          { status: 409 }
        );
      }

      const issued = await issueOtp(
        existing,
        { name: username, password: hashedPassword, regKeyHash: registrationKeyHash },
        now
      );
      if (!issued.ok) {
        return otpIssueErrorResponse(issued, now);
      }

      otp = issued.otp;
      userId = existing.user_id;
    } else {
      otp = generateOtp();
      const created = await prisma.user.create({
        data: {
          name: username,
          email,
          password: hashedPassword,
          role: "User",
          isVerified: false,
          otpCode: hashOtp(otp),
          otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
          otpLastSentAt: now,
          otpSendCount: 1,
          otpWindowStartedAt: now,
          regKeyHash: registrationKeyHash,
        },
      });
      userId = created.user_id;
    }

    try {
      await sendOtpEmail(email, otp);
    } catch (mailError) {
      console.error("Gagal mengirim email OTP:", mailError);
      await refundOtpSend(userId);

      const res = NextResponse.json(
        {
          message:
            "Akun dibuat, tapi gagal mengirim kode verifikasi. Coba kirim ulang di halaman verifikasi.",
          pendingVerification: true,
        },
        { status: 502 }
      );
      setRegistrationCookie(res, registrationKey);
      return res;
    }

    const res = NextResponse.json(
      { message: "Akun berhasil dibuat, silakan verifikasi e-mail Anda" },
      { status: 201 }
    );
    setRegistrationCookie(res, registrationKey);
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
