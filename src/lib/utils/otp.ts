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