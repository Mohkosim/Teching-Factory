// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    sMK: { findUnique: vi.fn() },
    pengajuanMitraSMK: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("@/lib/mail", () => ({ sendOtpEmail: vi.fn() }));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

// DNS/MX tidak boleh dipanggil sungguhan di unit test
vi.mock("@/lib/utils/email-validation", () => ({
  validateEmailForRegistration: vi.fn(),
}));

// bcrypt dibuat cepat & deterministik
vi.mock("bcryptjs", () => ({
  hash: vi.fn(async (pw: string) => `hashed:${pw}`),
}));

process.env.NEXTAUTH_SECRET = "rahasia-untuk-test";

const { POST } = await import("@/app/api/auth/register/smk/route");
const { prisma } = await import("@/lib/prisma");
const { sendOtpEmail } = await import("@/lib/mail");
const { rateLimit } = await import("@/lib/rate-limit");
const { validateEmailForRegistration } = await import("@/lib/utils/email-validation");
const { hashOtp, OTP_EXPIRY_MS } = await import("@/lib/utils/otp");
const { createRegistrationKey, hashRegistrationKey, REGISTRATION_COOKIE } = await import(
  "@/lib/utils/registration-key"
);

const m = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const mockRateLimit = m(rateLimit);
const mockSendEmail = m(sendOtpEmail);
const mockValidasiEmail = m(validateEmailForRegistration);
const mockUserFind = m(prisma.user.findUnique);
const mockUserCreate = m(prisma.user.create);
const mockUserUpdateMany = m(prisma.user.updateMany);
const mockSmkFind = m(prisma.sMK.findUnique);
const mockPengajuanFindFirst = m(prisma.pengajuanMitraSMK.findFirst);
const mockPengajuanCreate = m(prisma.pengajuanMitraSMK.create);
const mockPengajuanDeleteMany = m(prisma.pengajuanMitraSMK.deleteMany);

const SEKARANG = new Date("2026-10-03T03:00:00.000Z");

const payload = {
  username: "admin_smk",
  email: "admin@gmail.com",
  password: "Password123",
  namaSekolah: "SMK Negeri 1 Contoh",
  npsn: "12345678",
  namaPenanggungJawab: "Budi Santoso",
  noHpPenanggungJawab: "081234567890",
};

function buatRequest(body: unknown, cookieKey?: string) {
  return new NextRequest("http://localhost:3000/api/auth/register/smk", {
    method: "POST",
    body: JSON.stringify(body),
    headers: cookieKey ? { cookie: `${REGISTRATION_COOKIE}=${cookieKey}` } : {},
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SEKARANG);

  for (const fn of [
    mockRateLimit, mockSendEmail, mockValidasiEmail, mockUserFind, mockUserCreate,
    mockUserUpdateMany, mockSmkFind, mockPengajuanFindFirst, mockPengajuanCreate,
    mockPengajuanDeleteMany,
  ]) {
    fn.mockReset();
  }

  mockRateLimit.mockReturnValue({ success: true, remaining: 4, retryAfterMs: 0 });
  mockValidasiEmail.mockResolvedValue(null);
  mockSmkFind.mockResolvedValue(null);
  mockPengajuanFindFirst.mockResolvedValue(null);
  mockUserFind.mockResolvedValue(null);
  mockUserCreate.mockResolvedValue({ user_id: "user-baru" });
  mockUserUpdateMany.mockResolvedValue({ count: 1 });
  mockPengajuanCreate.mockResolvedValue({});
  mockPengajuanDeleteMany.mockResolvedValue({ count: 0 });
  mockSendEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/auth/register/smk - validasi input", () => {
  it("429 jika kena rate limit (5x per 15 menit)", async () => {
    mockRateLimit.mockReturnValue({ success: false, remaining: 0, retryAfterMs: 1000 });

    const res = await POST(buatRequest(payload));

    expect(res.status).toBe(429);
    expect(mockRateLimit).toHaveBeenCalledWith("register-smk:1.2.3.4", 5, 15 * 60 * 1000);
    expect(mockUserFind).not.toHaveBeenCalled();
  });

  it.each([
    [{ npsn: "1234" }, "NPSN harus 8 digit"],
    [{ npsn: "1234abcd" }, "NPSN hanya boleh berisi angka"],
    [{ noHpPenanggungJawab: "628123456789" }, "Nomor HP tidak valid (contoh: 081234567890)"],
    [{ namaSekolah: "SMK" }, "Nama sekolah minimal 5 karakter"],
    [{ namaPenanggungJawab: "Bu" }, "Nama penanggung jawab minimal 3 karakter"],
    [{ password: "password123" }, "Harus mengandung minimal 1 huruf kapital"],
    [{ username: "user name" }, "Hanya boleh huruf, angka, dan underscore"],
  ])("400 untuk data %j", async (override, pesan) => {
    const res = await POST(buatRequest({ ...payload, ...override }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe(pesan);
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("400 jika validasi email gagal (alias/sementara/MX), pesan diteruskan", async () => {
    mockValidasiEmail.mockResolvedValue("Gunakan email pribadi/permanen, bukan email sementara (temp-mail)");

    const res = await POST(buatRequest(payload));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain("bukan email sementara");
    expect(mockUserCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/register/smk - konflik data", () => {
  it("409 jika NPSN sudah terdaftar sebagai mitra SMK", async () => {
    mockSmkFind.mockResolvedValue({ smk_id: "smk-1" });

    const res = await POST(buatRequest(payload));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.message).toBe("NPSN ini sudah terdaftar sebagai mitra SMK");
    expect(mockSmkFind).toHaveBeenCalledWith({ where: { npsn: payload.npsn } });
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("409 jika NPSN sedang diajukan akun lain (pengajuan akun sendiri tidak dihitung)", async () => {
    mockPengajuanFindFirst.mockResolvedValue({ pengajuan_id: "p-1" });

    const res = await POST(buatRequest(payload));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.message).toBe("NPSN ini sedang diajukan oleh akun lain");
    expect(mockPengajuanFindFirst).toHaveBeenCalledWith({
      where: {
        npsn: payload.npsn,
        status: { in: ["MenungguVerifikasiEmail", "Menunggu"] },
        user: { email: { not: payload.email } },
      },
    });
  });

  it("409 jika e-mail sudah terdaftar & terverifikasi", async () => {
    mockUserFind.mockResolvedValue({ user_id: "u-1", isVerified: true });

    const res = await POST(buatRequest(payload));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.message).toBe("E-mail sudah terdaftar");
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/register/smk - akun baru", () => {
  it("201: membuat user belum terverifikasi dengan OTP ter-hash, pengajuan MenungguVerifikasiEmail, kirim email, set cookie", async () => {
    const res = await POST(buatRequest(payload));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.message).toContain("silakan verifikasi e-mail Anda");

    const { data } = mockUserCreate.mock.calls[0][0];
    expect(data).toMatchObject({
      name: payload.username,
      email: payload.email,
      password: `hashed:${payload.password}`,
      role: "User",
      isVerified: false,
      otpLastSentAt: SEKARANG,
      otpSendCount: 1,
      otpWindowStartedAt: SEKARANG,
    });
    expect(data.otpExpiresAt).toEqual(new Date(SEKARANG.getTime() + OTP_EXPIRY_MS));

    const otpAsli = mockSendEmail.mock.calls[0][1] as string;
    expect(mockSendEmail.mock.calls[0][0]).toBe(payload.email);
    expect(otpAsli).toMatch(/^\d{6}$/);
    expect(data.otpCode).toBe(hashOtp(otpAsli));

    expect(mockPengajuanCreate).toHaveBeenCalledWith({
      data: {
        user_id: "user-baru",
        namaSekolah: payload.namaSekolah,
        npsn: payload.npsn,
        namaPenanggungJawab: payload.namaPenanggungJawab,
        noHpPenanggungJawab: payload.noHpPenanggungJawab,
        status: "MenungguVerifikasiEmail",
      },
    });

    const cookie = res.cookies.get(REGISTRATION_COOKIE);
    expect(cookie?.value).toMatch(/^[0-9a-f]{64}$/);
    expect(data.regKeyHash).toBe(hashRegistrationKey(cookie!.value));
  });

  it("e-mail dinormalisasi ke huruf kecil sebelum dipakai", async () => {
    await POST(buatRequest({ ...payload, email: "  Admin@Gmail.COM " }));

    expect(mockUserFind).toHaveBeenCalledWith({ where: { email: "admin@gmail.com" } });
    expect(mockUserCreate.mock.calls[0][0].data.email).toBe("admin@gmail.com");
  });

  it("502 jika email gagal terkirim: akun & pengajuan tetap ada, jatah dikembalikan, cookie tetap diset", async () => {
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const res = await POST(buatRequest(payload));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.pendingVerification).toBe(true);
    expect(json.message).toContain("gagal mengirim kode verifikasi");
    expect(mockPengajuanCreate).toHaveBeenCalled();
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { user_id: "user-baru", otpSendCount: { gt: 0 } },
      data: { otpSendCount: { decrement: 1 }, otpLastSentAt: null },
    });
    expect(res.cookies.get(REGISTRATION_COOKIE)?.value).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("POST /api/auth/register/smk - e-mail pernah mendaftar tapi belum verifikasi", () => {
  function userLama(overrides: Record<string, unknown> = {}) {
    const { key, hash } = createRegistrationKey();
    const user = {
      user_id: "user-lama",
      email: payload.email,
      isVerified: false,
      regKeyHash: hash,
      otpExpiresAt: new Date(SEKARANG.getTime() + 5 * 60 * 1000),
      otpLastSentAt: new Date(SEKARANG.getTime() - 5 * 60 * 1000),
      otpSendCount: 1,
      otpWindowStartedAt: new Date(SEKARANG.getTime() - 60 * 60 * 1000),
      ...overrides,
    };
    mockUserFind.mockResolvedValue(user);
    return { key, user };
  }

  it("409 jika OTP masih berlaku & request datang dari perangkat lain", async () => {
    userLama();

    const res = await POST(buatRequest(payload, "kunci-perangkat-lain"));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.message).toContain("menunggu verifikasi dari perangkat lain");
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("perangkat yang sama boleh daftar ulang: data user diperbarui, pengajuan lama dihapus, pengajuan baru dibuat", async () => {
    const { key } = userLama();

    const res = await POST(buatRequest({ ...payload, username: "nama_baru" }, key));

    expect(res.status).toBe(201);
    expect(mockUserCreate).not.toHaveBeenCalled();

    const { data } = mockUserUpdateMany.mock.calls[0][0];
    expect(data.name).toBe("nama_baru");
    expect(data.password).toBe(`hashed:${payload.password}`);
    expect(data.otpSendCount).toBe(2);
    // kunci pendaftaran diganti baru
    expect(data.regKeyHash).toBe(hashRegistrationKey(res.cookies.get(REGISTRATION_COOKIE)!.value));

    expect(mockPengajuanDeleteMany).toHaveBeenCalledWith({
      where: { user_id: "user-lama", status: "MenungguVerifikasiEmail" },
    });
    expect(mockPengajuanCreate.mock.calls[0][0].data.user_id).toBe("user-lama");
  });

  it("perangkat lain boleh daftar ulang setelah OTP lama kedaluwarsa", async () => {
    userLama({ otpExpiresAt: new Date(SEKARANG.getTime() - 1000) });

    const res = await POST(buatRequest(payload, "kunci-perangkat-lain"));

    expect(res.status).toBe(201);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("429 jika masih cooldown 60 detik, tidak ada pengajuan yang dihapus/dibuat", async () => {
    const { key } = userLama({ otpLastSentAt: new Date(SEKARANG.getTime() - 10 * 1000) });

    const res = await POST(buatRequest(payload, key));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.message).toBe("Tunggu 50 detik sebelum meminta kode baru");
    expect(mockPengajuanDeleteMany).not.toHaveBeenCalled();
    expect(mockPengajuanCreate).not.toHaveBeenCalled();
  });

  it("429 jika jatah kirim OTP harian habis", async () => {
    const { key } = userLama({ otpSendCount: 3 });

    const res = await POST(buatRequest(payload, key));

    expect(res.status).toBe(429);
    expect((await res.json()).message).toContain("Batas pengiriman kode hari ini sudah habis");
    expect(mockPengajuanCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/register/smk - error server", () => {
  it("500 jika database error", async () => {
    mockSmkFind.mockRejectedValue(new Error("DB down"));

    const res = await POST(buatRequest(payload));

    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe("Terjadi kesalahan server");
  });
});
