import crypto from "crypto";
import type { NextResponse } from "next/server";

export const REGISTRATION_COOKIE = "tefa_reg";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;
const COOKIE_PATH = "/api/auth";

export function hashRegistrationKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function createRegistrationKey(): { key: string; hash: string } {
  const key = crypto.randomBytes(32).toString("hex");
  return { key, hash: hashRegistrationKey(key) };
}

export function matchesRegistrationKey(
  key: string | null | undefined,
  storedHash: string | null | undefined
): boolean {
  if (!key || !storedHash) return false;
  const a = Buffer.from(hashRegistrationKey(key));
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function setRegistrationCookie(res: NextResponse, key: string): void {
  res.cookies.set({
    name: REGISTRATION_COOKIE,
    value: key,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: COOKIE_PATH,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearRegistrationCookie(res: NextResponse): void {
  res.cookies.set({
    name: REGISTRATION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}
