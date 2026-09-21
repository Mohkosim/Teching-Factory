import crypto from "crypto";

/**
 * Menghasilkan kode OTP numerik 6 digit (000000 - 999999).
 */
export function generateOtp(): string {
  const otp = crypto.randomInt(0, 1_000_000);
  return otp.toString().padStart(6, "0");
}

export const OTP_EXPIRY_MS = 1000 * 60 * 10;
export const OTP_RESEND_COOLDOWN_MS = 1000 * 60;

/** Jendela pembatasan pengiriman OTP: maksimal N kali per 24 jam per akun. */
export const OTP_SEND_WINDOW_MS = 1000 * 60 * 60 * 24;
const DEFAULT_OTP_MAX_SENDS_PER_DAY = 3;

/** Batas salah memasukkan OTP sebelum kode dibatalkan. */
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Batas kirim OTP per 24 jam. Default 3.
 * Bisa diubah lewat env OTP_MAX_SENDS_PER_DAY (mis. dinaikkan saat testing di lokal).
 */
export function getOtpMaxSendsPerDay(): number {
  const value = Number(process.env.OTP_MAX_SENDS_PER_DAY);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_OTP_MAX_SENDS_PER_DAY;
}

function getOtpSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET belum diisi di environment variable");
  }
  return `${secret}:otp`;
}

/**
 * OTP disimpan di database dalam bentuk hash (HMAC-SHA256 dengan secret server),
 * sehingga isi database saja tidak cukup untuk mengetahui kodenya.
 */
export function hashOtp(otp: string): string {
  return crypto.createHmac("sha256", getOtpSecret()).update(otp).digest("hex");
}

/** Membandingkan OTP yang diketik user dengan hash di database (constant-time). */
export function otpMatches(input: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashOtp(input));
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
