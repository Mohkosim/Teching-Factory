import { encode, decode, type JWT } from "next-auth/jwt";

const PURPOSE = "otp-login";
export const OTP_TICKET_TTL_SECONDS = 60;

function getSecret(): string {
  const base = process.env.NEXTAUTH_SECRET;
  if (!base) {
    throw new Error("NEXTAUTH_SECRET belum diisi di environment variable");
  }
  return `${base}:otp-login-ticket`;
}

export async function createOtpLoginTicket(userId: string): Promise<string> {
  return encode({
    token: { purpose: PURPOSE, userId } as unknown as JWT,
    secret: getSecret(),
    maxAge: OTP_TICKET_TTL_SECONDS,
  });
}

export async function verifyOtpLoginTicket(ticket: string): Promise<string | null> {
  try {
    const payload = await decode({ token: ticket, secret: getSecret() });
    if (payload?.purpose === PURPOSE && typeof payload.userId === "string") {
      return payload.userId;
    }
    return null;
  } catch {
    return null;
  }
}
