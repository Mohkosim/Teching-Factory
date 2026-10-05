// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/mail", () => ({
  sendOtpEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

process.env.NEXTAUTH_SECRET = "rahasia-untuk-test";

const { POST } = await import("@/app/api/auth/resend-otp/route");
const { prisma } = await import("@/lib/prisma");
const { sendOtpEmail } = await import("@/lib/mail");
const { rateLimit } = await import("@/lib/rate-limit");
const { hashOtp, OTP_EXPIRY_MS, OTP_RESEND_COOLDOWN_MS } = await import("@/lib/utils/otp");
const { createRegistrationKey, REGISTRATION_COOKIE } = await import(
  "@/lib/utils/registration-key"
);

const mockRateLimit = vi.mocked(rateLimit);
const mockSendEmail = vi.mocked(sendOtpEmail);
const mockFindUnique = vi.mocked(prisma.user.findUnique) as unknown as ReturnType<typeof vi.fn>;
const mockUpdateMany = vi.mocked(prisma.user.updateMany) as unknown as ReturnType<typeof vi.fn>;

const EMAIL = "user@gmail.com";
const USER_ID = "user-1";
const SEKARANG = new Date("2026-10-03T03:00:00.000Z");

function buatRequest(body: unknown, cookieKey?: string) {
  return new NextRequest("http://localhost:3000/api/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify(body),
    headers: cookieKey ? { cookie: `${REGISTRATION_COOKIE}=${cookieKey}` } : {},
  });
}

function siapkanUser(overrides: Record<string, unknown> = {}) {
  const { key, hash } = createRegistrationKey();
  const user = {
    user_id: USER_ID,
    email: EMAIL,
    isVerified: false,
    regKeyHash: hash,
    otpCode: hashOtp("111111"),
    otpLastSentAt: new Date(SEKARANG.getTime() - 2 * OTP_RESEND_COOLDOWN_MS),
    otpSendCount: 1,
    otpWindowStartedAt: new Date(SEKARANG.getTime() - 60 * 60 * 1000),
    ...overrides,
  };
  mockFindUnique.mockResolvedValue(user);
  return { key, user };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SEKARANG);
  delete process.env.OTP_MAX_SENDS_PER_DAY;

  mockRateLimit.mockReset();
  mockRateLimit.mockReturnValue({ success: true, remaining: 9, retryAfterMs: 0 });
  mockFindUnique.mockReset();
  mockUpdateMany.mockReset();
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockSendEmail.mockReset();
  mockSendEmail.mockResolvedValue(undefined as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/auth/resend-otp - validasi & sesi", () => {
  it("429 jika kena rate limit", async () => {
    mockRateLimit.mockReturnValue({ success: false, remaining: 0, retryAfterMs: 1000 });

    const res = await POST(buatRequest({ email: EMAIL }));

    expect(res.status).toBe(429);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockRateLimit).toHaveBeenCalledWith("resend-otp:1.2.3.4", 10, 15 * 60 * 1000);
  });

  it("400 jika format email tidak valid", async () => {
    const res = await POST(buatRequest({ email: "bukan-email" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Format e-mail tidak valid");
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("akun sudah terverifikasi -> 200 dan tidak ada OTP yang dikirim", async () => {
    mockFindUnique.mockResolvedValue({ user_id: USER_ID, isVerified: true });

    const res = await POST(buatRequest({ email: EMAIL }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Akun sudah terverifikasi, silakan masuk");
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("403 jika email tidak terdaftar", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(buatRequest({ email: EMAIL }, "kunci"));

    expect(res.status).toBe(403);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("403 jika cookie pendaftaran tidak ada atau tidak cocok", async () => {
    const { key } = siapkanUser();

    const tanpaCookie = await POST(buatRequest({ email: EMAIL }));
    const cookieSalah = await POST(buatRequest({ email: EMAIL }, key + "x"));

    expect(tanpaCookie.status).toBe(403);
    expect(cookieSalah.status).toBe(403);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/resend-otp - batas pengiriman", () => {
  it("429 saat masih dalam masa cooldown 60 detik, dengan sisa detik", async () => {
    const { key } = siapkanUser({
      otpLastSentAt: new Date(SEKARANG.getTime() - 20 * 1000),
    });

    const res = await POST(buatRequest({ email: EMAIL }, key));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.message).toBe("Tunggu 40 detik sebelum meminta kode baru");
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("429 saat jatah 3x per 24 jam habis, pesan menyebut batas & perkiraan jam", async () => {
    const mulaiJendela = new Date(SEKARANG.getTime() - 60 * 60 * 1000);
    const { key } = siapkanUser({ otpSendCount: 3, otpWindowStartedAt: mulaiJendela });

    const res = await POST(buatRequest({ email: EMAIL }, key));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.message).toContain("maksimal 3x per 24 jam");
    expect(json.message).toContain("sekitar 23 jam lagi");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("jatah kembali penuh setelah jendela 24 jam lewat", async () => {
    const { key } = siapkanUser({
      otpSendCount: 3,
      otpWindowStartedAt: new Date(SEKARANG.getTime() - 25 * 60 * 60 * 1000),
    });

    const res = await POST(buatRequest({ email: EMAIL }, key));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.remainingToday).toBe(2);
    const data = mockUpdateMany.mock.calls[0][0].data;
    expect(data.otpSendCount).toBe(1);
    expect(data.otpWindowStartedAt).toEqual(SEKARANG);
  });

  it("batas harian bisa diubah lewat env OTP_MAX_SENDS_PER_DAY", async () => {
    process.env.OTP_MAX_SENDS_PER_DAY = "5";
    const { key } = siapkanUser({ otpSendCount: 3 });

    const res = await POST(buatRequest({ email: EMAIL }, key));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.remainingToday).toBe(1);
  });

  it("429 'sedang diproses' jika terjadi balapan (updateMany count 0)", async () => {
    const { key } = siapkanUser();
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(buatRequest({ email: EMAIL }, key));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.message).toBe("Permintaan sedang diproses, coba lagi sebentar lagi");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/resend-otp - pengiriman berhasil", () => {
  it("200, menyimpan hash OTP baru, mengirim OTP asli lewat email, dan mengembalikan sisa jatah", async () => {
    const { key } = siapkanUser();

    const res = await POST(buatRequest({ email: EMAIL }, key));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ message: "Kode OTP baru sudah dikirim", remainingToday: 1 });

    const [email, otpAsli] = mockSendEmail.mock.calls[0];
    expect(email).toBe(EMAIL);
    expect(otpAsli).toMatch(/^\d{6}$/);

    const { data } = mockUpdateMany.mock.calls[0][0];
    expect(data.otpCode).toBe(hashOtp(otpAsli as string));
    expect(data.otpCode).not.toBe(otpAsli);
    expect(data.otpExpiresAt).toEqual(new Date(SEKARANG.getTime() + OTP_EXPIRY_MS));
    expect(data.otpLastSentAt).toEqual(SEKARANG);
    expect(data.otpAttempts).toBe(0);
    expect(data.otpSendCount).toBe(2);
  });

  it("update dikunci dengan otpSendCount & otpWindowStartedAt lama (optimistic lock)", async () => {
    const { key, user } = siapkanUser();

    await POST(buatRequest({ email: EMAIL }, key));

    expect(mockUpdateMany.mock.calls[0][0].where).toEqual({
      user_id: USER_ID,
      otpSendCount: user.otpSendCount,
      otpWindowStartedAt: user.otpWindowStartedAt,
    });
  });
});

describe("POST /api/auth/resend-otp - gagal kirim email", () => {
  it("502 dan jatah kirim dikembalikan (refund) supaya user tidak rugi kuota", async () => {
    const { key } = siapkanUser();
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const res = await POST(buatRequest({ email: EMAIL }, key));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.message).toBe("Gagal mengirim email, coba lagi beberapa saat lagi.");
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
    expect(mockUpdateMany).toHaveBeenLastCalledWith({
      where: { user_id: USER_ID, otpSendCount: { gt: 0 } },
      data: { otpSendCount: { decrement: 1 }, otpLastSentAt: null },
    });
  });
});

describe("POST /api/auth/resend-otp - error server", () => {
  it("500 jika database error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(buatRequest({ email: EMAIL }));

    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe("Terjadi kesalahan server");
  });
});
