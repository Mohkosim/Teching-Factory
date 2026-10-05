// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    pengajuanMitraSMK: { updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

process.env.NEXTAUTH_SECRET = "rahasia-untuk-test";

const { POST } = await import("@/app/api/auth/verify-otp/route");
const { prisma } = await import("@/lib/prisma");
const { rateLimit } = await import("@/lib/rate-limit");
const { hashOtp, OTP_MAX_ATTEMPTS } = await import("@/lib/utils/otp");
const { createRegistrationKey, REGISTRATION_COOKIE } = await import(
  "@/lib/utils/registration-key"
);
const { verifyOtpLoginTicket } = await import("@/lib/utils/otp-login-ticket");

const mockRateLimit = vi.mocked(rateLimit);
const mockFindUnique = vi.mocked(prisma.user.findUnique) as unknown as ReturnType<typeof vi.fn>;
const mockUserUpdate = vi.mocked(prisma.user.update) as unknown as ReturnType<typeof vi.fn>;
const mockPengajuanUpdateMany = vi.mocked(prisma.pengajuanMitraSMK.updateMany) as unknown as ReturnType<typeof vi.fn>;

const EMAIL = "user@gmail.com";
const OTP = "123456";
const USER_ID = "user-1";

function buatRequest(body: unknown, cookieKey?: string) {
  return new NextRequest("http://localhost:3000/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(body),
    headers: cookieKey ? { cookie: `${REGISTRATION_COOKIE}=${cookieKey}` } : {},
  });
}

/** User belum terverifikasi dengan OTP valid & cookie perangkat yang cocok. */
function siapkanUser(overrides: Record<string, unknown> = {}) {
  const { key, hash } = createRegistrationKey();
  const user = {
    user_id: USER_ID,
    email: EMAIL,
    isVerified: false,
    otpCode: hashOtp(OTP),
    otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    regKeyHash: hash,
    ...overrides,
  };
  mockFindUnique.mockResolvedValue(user);
  return { key, user };
}

beforeEach(() => {
  mockRateLimit.mockReset();
  mockRateLimit.mockReturnValue({ success: true, remaining: 19, retryAfterMs: 0 });
  mockFindUnique.mockReset();
  mockUserUpdate.mockReset();
  mockUserUpdate.mockResolvedValue({ otpAttempts: 1 });
  mockPengajuanUpdateMany.mockReset();
});

describe("POST /api/auth/verify-otp - validasi & pembatasan", () => {
  it("429 jika kena rate limit, tanpa menyentuh database", async () => {
    mockRateLimit.mockReturnValue({ success: false, remaining: 0, retryAfterMs: 1000 });

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }));

    expect(res.status).toBe(429);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockRateLimit).toHaveBeenCalledWith("verify-otp:1.2.3.4", 20, 15 * 60 * 1000);
  });

  it.each([
    [{ email: EMAIL, otp: "" }, "Kode OTP wajib diisi"],
    [{ email: EMAIL, otp: "123" }, "Kode OTP harus 6 digit"],
    [{ email: EMAIL, otp: "12ab56" }, "Kode OTP hanya boleh berisi angka"],
    [{ email: "bukan-email", otp: OTP }, "Format e-mail tidak valid"],
  ])("400 untuk input %j", async (body, pesan) => {
    const res = await POST(buatRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe(pesan);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/verify-otp - sesi pendaftaran", () => {
  it("akun sudah terverifikasi -> 200 tanpa mengubah data", async () => {
    mockFindUnique.mockResolvedValue({ user_id: USER_ID, isVerified: true });

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Akun sudah terverifikasi, silakan masuk");
    expect(json.loginTicket).toBeUndefined();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("403 jika email tidak terdaftar", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, "kunci-apa-saja"));

    expect(res.status).toBe(403);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("403 jika cookie pendaftaran tidak ada (perangkat lain)", async () => {
    siapkanUser();

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.message).toContain("Sesi pendaftaran tidak valid");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("403 jika cookie pendaftaran tidak cocok dengan hash di database", async () => {
    siapkanUser();

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, "kunci-palsu"));

    expect(res.status).toBe(403);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("400 jika belum ada OTP yang dikirim", async () => {
    const { key } = siapkanUser({ otpCode: null, otpExpiresAt: null });

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, key));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Belum ada kode OTP yang dikirim, minta kode baru");
  });

  it("400 jika OTP sudah kedaluwarsa, percobaan tidak dihitung", async () => {
    const { key } = siapkanUser({ otpExpiresAt: new Date(Date.now() - 1000) });

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, key));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Kode OTP sudah kedaluwarsa, minta kode baru");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/verify-otp - pencocokan kode", () => {
  it("OTP salah -> 400 dengan sisa percobaan, akun tetap belum terverifikasi", async () => {
    const { key } = siapkanUser();
    mockUserUpdate.mockResolvedValueOnce({ otpAttempts: 2 });

    const res = await POST(buatRequest({ email: EMAIL, otp: "000000" }, key));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe(`Kode OTP salah (sisa ${OTP_MAX_ATTEMPTS - 2} percobaan)`);
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { user_id: USER_ID },
      data: { otpAttempts: { increment: 1 } },
      select: { otpAttempts: true },
    });
    expect(mockPengajuanUpdateMany).not.toHaveBeenCalled();
  });

  it("percobaan salah terakhir -> pesan 'percobaan habis'", async () => {
    const { key } = siapkanUser();
    mockUserUpdate.mockResolvedValueOnce({ otpAttempts: OTP_MAX_ATTEMPTS });

    const res = await POST(buatRequest({ email: EMAIL, otp: "000000" }, key));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Kode OTP salah. Percobaan habis, silakan minta kode baru.");
  });

  it("melebihi batas percobaan -> 429 dan OTP dibatalkan, walau kodenya benar", async () => {
    const { key } = siapkanUser();
    mockUserUpdate.mockResolvedValueOnce({ otpAttempts: OTP_MAX_ATTEMPTS + 1 });

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, key));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.message).toContain("Kode dibatalkan");
    expect(mockUserUpdate).toHaveBeenLastCalledWith({
      where: { user_id: USER_ID },
      data: { otpCode: null, otpExpiresAt: null },
    });
    expect(mockPengajuanUpdateMany).not.toHaveBeenCalled();
  });

  it("OTP benar tepat di batas percobaan terakhir tetap diterima", async () => {
    const { key } = siapkanUser();
    mockUserUpdate.mockResolvedValueOnce({ otpAttempts: OTP_MAX_ATTEMPTS });

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, key));

    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/verify-otp - verifikasi berhasil", () => {
  it("menandai akun terverifikasi dan membersihkan semua data OTP", async () => {
    const { key } = siapkanUser();

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, key));

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenLastCalledWith({
      where: { user_id: USER_ID },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpLastSentAt: null,
        otpAttempts: 0,
        regKeyHash: null,
      },
    });
  });

  it("meneruskan pengajuan mitra SMK dari MenungguVerifikasiEmail ke Menunggu", async () => {
    const { key } = siapkanUser();

    await POST(buatRequest({ email: EMAIL, otp: OTP }, key));

    expect(mockPengajuanUpdateMany).toHaveBeenCalledWith({
      where: { user_id: USER_ID, status: "MenungguVerifikasiEmail" },
      data: { status: "Menunggu" },
    });
  });

  it("mengembalikan loginTicket yang valid untuk user tersebut", async () => {
    const { key } = siapkanUser();

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, key));
    const json = await res.json();

    expect(json.message).toBe("Verifikasi berhasil");
    expect(typeof json.loginTicket).toBe("string");
    await expect(verifyOtpLoginTicket(json.loginTicket)).resolves.toBe(USER_ID);
  });

  it("menghapus cookie pendaftaran (maxAge 0)", async () => {
    const { key } = siapkanUser();

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }, key));
    const cookie = res.cookies.get(REGISTRATION_COOKIE);

    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });

  it("email di-normalisasi (huruf besar & spasi) sebelum mencari user", async () => {
    const { key } = siapkanUser();

    await POST(buatRequest({ email: "  USER@Gmail.com ", otp: OTP }, key));

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: EMAIL } });
  });
});

describe("POST /api/auth/verify-otp - error server", () => {
  it("500 jika database error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(buatRequest({ email: EMAIL, otp: OTP }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).toBe("Terjadi kesalahan server");
  });
});
