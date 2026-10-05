// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { updateMany: vi.fn() } },
}));

process.env.NEXTAUTH_SECRET = "rahasia-untuk-test";

const otp = await import("@/lib/utils/otp");
const { issueOtp, refundOtpSend } = await import("@/lib/utils/otp-issue");
const { createOtpLoginTicket, verifyOtpLoginTicket, OTP_TICKET_TTL_SECONDS } = await import(
  "@/lib/utils/otp-login-ticket"
);
const reg = await import("@/lib/utils/registration-key");
const { prisma } = await import("@/lib/prisma");

const mockUpdateMany = vi.mocked(prisma.user.updateMany) as unknown as ReturnType<typeof vi.fn>;

describe("generateOtp", () => {
  it("selalu 6 digit angka (termasuk yang diawali nol)", () => {
    for (let i = 0; i < 200; i++) expect(otp.generateOtp()).toMatch(/^\d{6}$/);
  });

  it("menghasilkan kode berbeda-beda (bukan nilai tetap)", () => {
    const hasil = new Set(Array.from({ length: 50 }, () => otp.generateOtp()));

    expect(hasil.size).toBeGreaterThan(40);
  });
});

describe("hashOtp & otpMatches", () => {
  const SECRET = process.env.NEXTAUTH_SECRET;

  afterEach(() => {
    process.env.NEXTAUTH_SECRET = SECRET;
  });

  it("hash deterministik, 64 hex, dan tidak sama dengan OTP asli", () => {
    const h = otp.hashOtp("123456");

    expect(h).toBe(otp.hashOtp("123456"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("123456");
  });

  it("OTP berbeda menghasilkan hash berbeda", () => {
    expect(otp.hashOtp("123456")).not.toBe(otp.hashOtp("123457"));
  });

  it("hash bergantung pada NEXTAUTH_SECRET", () => {
    const sebelum = otp.hashOtp("123456");
    process.env.NEXTAUTH_SECRET = "secret-lain";

    expect(otp.hashOtp("123456")).not.toBe(sebelum);
  });

  it("melempar error jika NEXTAUTH_SECRET belum diisi", () => {
    delete process.env.NEXTAUTH_SECRET;

    expect(() => otp.hashOtp("123456")).toThrow("NEXTAUTH_SECRET belum diisi");
  });

  it("otpMatches true untuk kode benar, false untuk salah / hash kosong", () => {
    const h = otp.hashOtp("123456");

    expect(otp.otpMatches("123456", h)).toBe(true);
    expect(otp.otpMatches("654321", h)).toBe(false);
    expect(otp.otpMatches("123456", null)).toBe(false);
    expect(otp.otpMatches("123456", undefined)).toBe(false);
    expect(otp.otpMatches("123456", "")).toBe(false);
  });

  it("otpMatches false (tanpa melempar) jika hash tersimpan panjangnya berbeda", () => {
    expect(otp.otpMatches("123456", "pendek")).toBe(false);
  });
});

describe("getOtpMaxSendsPerDay", () => {
  afterEach(() => {
    delete process.env.OTP_MAX_SENDS_PER_DAY;
  });

  it("default 3", () => {
    expect(otp.getOtpMaxSendsPerDay()).toBe(3);
  });

  it("memakai env jika bilangan bulat positif", () => {
    process.env.OTP_MAX_SENDS_PER_DAY = "10";
    expect(otp.getOtpMaxSendsPerDay()).toBe(10);
  });

  it.each(["0", "-2", "1.5", "abc", ""])("kembali ke default 3 untuk env %j", (v) => {
    process.env.OTP_MAX_SENDS_PER_DAY = v;
    expect(otp.getOtpMaxSendsPerDay()).toBe(3);
  });

  it("konstanta: kedaluwarsa 10 menit, cooldown 1 menit, maksimal 5 percobaan", () => {
    expect(otp.OTP_EXPIRY_MS).toBe(10 * 60 * 1000);
    expect(otp.OTP_RESEND_COOLDOWN_MS).toBe(60 * 1000);
    expect(otp.OTP_MAX_ATTEMPTS).toBe(5);
    expect(otp.OTP_SEND_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe("issueOtp", () => {
  const NOW = new Date("2026-10-03T03:00:00.000Z");
  const user = (o: Record<string, unknown> = {}) => ({
    user_id: "u1",
    otpLastSentAt: null,
    otpSendCount: 0,
    otpWindowStartedAt: null,
    ...o,
  });

  beforeEach(() => {
    mockUpdateMany.mockReset();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("pengiriman pertama: jendela baru dimulai, sisa jatah 2", async () => {
    const r = await issueOtp(user(), {}, NOW);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remainingToday).toBe(2);
    expect(mockUpdateMany.mock.calls[0][0].data).toMatchObject({
      otpSendCount: 1,
      otpWindowStartedAt: NOW,
      otpAttempts: 0,
    });
  });

  it("jendela yang masih berjalan dipertahankan (tidak direset)", async () => {
    const mulai = new Date(NOW.getTime() - 3_600_000);
    await issueOtp(user({ otpSendCount: 1, otpWindowStartedAt: mulai }), {}, NOW);

    expect(mockUpdateMany.mock.calls[0][0].data.otpWindowStartedAt).toEqual(mulai);
    expect(mockUpdateMany.mock.calls[0][0].data.otpSendCount).toBe(2);
  });

  it("cooldown tepat 60 detik sudah boleh kirim, 59 detik belum", async () => {
    const boleh = await issueOtp(user({ otpLastSentAt: new Date(NOW.getTime() - 60_000) }), {}, NOW);
    const belum = await issueOtp(user({ otpLastSentAt: new Date(NOW.getTime() - 59_000) }), {}, NOW);

    expect(boleh.ok).toBe(true);
    expect(belum).toEqual({ ok: false, reason: "cooldown", retryAfterSeconds: 1 });
  });

  it("jatah habis: retryAt = awal jendela + 24 jam", async () => {
    const mulai = new Date(NOW.getTime() - 3_600_000);
    const r = await issueOtp(user({ otpSendCount: 3, otpWindowStartedAt: mulai }), {}, NOW);

    expect(r).toEqual({ ok: false, reason: "daily_limit", retryAt: new Date(mulai.getTime() + 86_400_000) });
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("data tambahan (extraData) ikut disimpan bersama OTP", async () => {
    await issueOtp(user(), { name: "nama_baru" }, NOW);

    expect(mockUpdateMany.mock.calls[0][0].data.name).toBe("nama_baru");
  });

  it("OTP yang dikembalikan cocok dengan hash yang disimpan", async () => {
    const r = await issueOtp(user(), {}, NOW);

    expect(r.ok).toBe(true);
    if (r.ok) expect(mockUpdateMany.mock.calls[0][0].data.otpCode).toBe(otp.hashOtp(r.otp));
  });
});

describe("refundOtpSend", () => {
  beforeEach(() => {
    mockUpdateMany.mockReset();
  });

  it("mengurangi hitungan kirim & mereset otpLastSentAt", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });

    await refundOtpSend("u1");

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { user_id: "u1", otpSendCount: { gt: 0 } },
      data: { otpSendCount: { decrement: 1 }, otpLastSentAt: null },
    });
  });

  it("tidak melempar error jika database gagal", async () => {
    mockUpdateMany.mockImplementation(async () => {
      throw new Error("DB down");
    });

    await expect(refundOtpSend("u1")).resolves.toBeUndefined();
  });
});

describe("OTP login ticket", () => {
  it("tiket valid mengembalikan userId", async () => {
    const t = await createOtpLoginTicket("user-42");

    await expect(verifyOtpLoginTicket(t)).resolves.toBe("user-42");
  });

  it("tiket sampah / dirusak -> null", async () => {
    await expect(verifyOtpLoginTicket("bukan-tiket")).resolves.toBeNull();
    const t = await createOtpLoginTicket("user-42");
    await expect(verifyOtpLoginTicket(t.slice(0, -3) + "abc")).resolves.toBeNull();
  });

  it("tiket yang dibuat dengan secret lain ditolak", async () => {
    const t = await createOtpLoginTicket("user-42");
    const asli = process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "secret-lain";

    await expect(verifyOtpLoginTicket(t)).resolves.toBeNull();
    process.env.NEXTAUTH_SECRET = asli;
  });

  it("tiket kedaluwarsa setelah 60 detik", async () => {
    expect(OTP_TICKET_TTL_SECONDS).toBe(60);
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-03T03:00:00.000Z"));
      const t = await createOtpLoginTicket("user-42");

      vi.setSystemTime(new Date("2026-10-03T03:00:30.000Z"));
      await expect(verifyOtpLoginTicket(t)).resolves.toBe("user-42");

      vi.setSystemTime(new Date("2026-10-03T03:01:30.000Z"));
      await expect(verifyOtpLoginTicket(t)).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("melempar error jika NEXTAUTH_SECRET belum diisi", async () => {
    const asli = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    await expect(createOtpLoginTicket("u")).rejects.toThrow("NEXTAUTH_SECRET belum diisi");
    process.env.NEXTAUTH_SECRET = asli;
  });
});

describe("registration key", () => {
  it("createRegistrationKey menghasilkan key 64 hex acak beserta hash SHA-256-nya", () => {
    const a = reg.createRegistrationKey();
    const b = reg.createRegistrationKey();

    expect(a.key).toMatch(/^[0-9a-f]{64}$/);
    expect(a.key).not.toBe(b.key);
    expect(a.hash).toBe(reg.hashRegistrationKey(a.key));
    expect(a.hash).not.toBe(a.key);
  });

  it("matchesRegistrationKey: cocok hanya untuk key yang benar", () => {
    const { key, hash } = reg.createRegistrationKey();

    expect(reg.matchesRegistrationKey(key, hash)).toBe(true);
    expect(reg.matchesRegistrationKey("salah", hash)).toBe(false);
    expect(reg.matchesRegistrationKey(undefined, hash)).toBe(false);
    expect(reg.matchesRegistrationKey(key, null)).toBe(false);
    expect(reg.matchesRegistrationKey("", "")).toBe(false);
  });

  it("cookie pendaftaran: httpOnly, lax, path /api/auth, berlaku 24 jam; clear = maxAge 0", async () => {
    const { NextResponse } = await import("next/server");
    const res = NextResponse.json({});

    reg.setRegistrationCookie(res, "kunci-123");
    const set = res.cookies.get(reg.REGISTRATION_COOKIE);
    expect(set).toMatchObject({ value: "kunci-123", httpOnly: true, sameSite: "lax", path: "/api/auth", maxAge: 86_400 });

    reg.clearRegistrationCookie(res);
    expect(res.cookies.get(reg.REGISTRATION_COOKIE)).toMatchObject({ value: "", maxAge: 0 });
  });
});
