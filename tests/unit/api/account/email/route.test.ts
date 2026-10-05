// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));

vi.mock("@/lib/mail", () => ({
  sendResetPasswordEmail: vi.fn(),
  sendEmailChangedNotice: vi.fn(),
}));

vi.mock("@/lib/utils/audit-log", () => ({ recordAuditLog: vi.fn() }));

vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));

const { PATCH } = await import("@/app/api/account/[id]/email/route");
const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { sendResetPasswordEmail, sendEmailChangedNotice } = await import("@/lib/mail");
const { recordAuditLog } = await import("@/lib/utils/audit-log");
const { rateLimit } = await import("@/lib/rate-limit");

const m = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const mockSession = m(getServerSession);
const mockFind = m(prisma.user.findUnique);
const mockUpdate = m(prisma.user.update);
const mockSendReset = m(sendResetPasswordEmail);
const mockSendNotice = m(sendEmailChangedNotice);
const mockAudit = m(recordAuditLog);
const mockRateLimit = m(rateLimit);

const TARGET_ID = "target-1";
const akun = { user_id: TARGET_ID, name: "Admin Jurusan", email: "lama@gmail.com" };

function buatRequest(body: unknown) {
  return new NextRequest(`http://localhost:3000/api/account/${TARGET_ID}/email`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ id: TARGET_ID }) };

function sessionSuperAdmin() {
  mockSession.mockResolvedValue({
    user: { id: "sa-1", role: "SuperAdmin", name: "Super Admin", email: "sa@gmail.com" },
  });
}

beforeEach(() => {
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  for (const fn of [mockSession, mockFind, mockUpdate, mockSendReset, mockSendNotice, mockAudit, mockRateLimit]) {
    fn.mockReset();
  }
  sessionSuperAdmin();
  mockRateLimit.mockReturnValue({ success: true, remaining: 19, retryAfterMs: 0 });
  mockFind.mockImplementation(async ({ where }: { where: { user_id?: string; email?: string } }) =>
    where.user_id === TARGET_ID ? akun : null
  );
  mockUpdate.mockImplementation(async ({ data }: { data: { email: string } }) => ({ ...akun, email: data.email }));
  mockSendReset.mockResolvedValue(undefined);
  mockSendNotice.mockResolvedValue(undefined);
  mockAudit.mockResolvedValue(undefined);
});

describe("PATCH /api/account/[id]/email - otorisasi", () => {
  it("401 jika belum login", async () => {
    mockSession.mockResolvedValue(null);

    const res = await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it.each(["User", "AdminSMK", "AdminJurusan"])("401 jika role %s (hanya SuperAdmin)", async (role) => {
    mockSession.mockResolvedValue({ user: { id: "x", role } });

    const res = await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    expect(res.status).toBe(401);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("429 jika kena rate limit per SuperAdmin", async () => {
    mockRateLimit.mockReturnValue({ success: false, remaining: 0, retryAfterMs: 1000 });

    const res = await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    expect(res.status).toBe(429);
    expect(mockRateLimit).toHaveBeenCalledWith("change-email:sa-1", 20, 15 * 60 * 1000);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/account/[id]/email - validasi", () => {
  it.each([
    [{ newEmail: "" }, "E-mail wajib diisi"],
    [{ newEmail: "bukan-email" }, "Format e-mail tidak valid"],
    [{}, "Invalid input: expected string, received undefined"],
  ])("400 untuk body %j", async (body, pesan) => {
    const res = await PATCH(buatRequest(body), ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe(pesan);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("404 jika akun tidak ditemukan", async () => {
    mockFind.mockResolvedValue(null);

    const res = await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    expect(res.status).toBe(404);
    expect((await res.json()).message).toBe("Akun tidak ditemukan");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 jika e-mail baru sama dengan e-mail saat ini (tidak peka huruf besar)", async () => {
    const res = await PATCH(buatRequest({ newEmail: "  LAMA@Gmail.com " }), ctx);

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("E-mail baru sama dengan e-mail saat ini");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("409 jika e-mail baru sudah dipakai akun lain", async () => {
    mockFind.mockImplementation(async ({ where }: { where: { user_id?: string; email?: string } }) =>
      where.user_id === TARGET_ID ? akun : { user_id: "orang-lain" }
    );

    const res = await PATCH(buatRequest({ newEmail: "dipakai@gmail.com" }), ctx);

    expect(res.status).toBe(409);
    expect((await res.json()).message).toBe("E-mail tersebut sudah dipakai akun lain");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSendReset).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/account/[id]/email - berhasil", () => {
  it("mengganti e-mail, membuat token reset 30 menit, dan menyimpannya", async () => {
    const sebelum = Date.now();

    const res = await PATCH(buatRequest({ newEmail: "Baru@Gmail.com" }), ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("E-mail berhasil diubah dan link atur ulang kata sandi telah dikirim");
    expect(json.data.email).toBe("baru@gmail.com");

    const arg = mockUpdate.mock.calls[0][0];
    expect(arg.where).toEqual({ user_id: TARGET_ID });
    expect(arg.data.email).toBe("baru@gmail.com");
    expect(arg.data.resetToken).toMatch(/^[0-9a-f]{64}$/);
    const ttl = arg.data.resetTokenExpiry.getTime() - sebelum;
    expect(ttl).toBeGreaterThan(29 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(30 * 60 * 1000 + 1000);
  });

  it("link reset dikirim ke e-mail BARU dengan token yang sama dengan yang disimpan", async () => {
    await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    const token = mockUpdate.mock.calls[0][0].data.resetToken;
    expect(mockSendReset).toHaveBeenCalledWith(
      "baru@gmail.com",
      `http://localhost:3000/auth/reset-password?token=${token}`
    );
  });

  it("pemberitahuan perubahan dikirim ke e-mail LAMA", async () => {
    await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    expect(mockSendNotice).toHaveBeenCalledWith("lama@gmail.com", "baru@gmail.com");
  });

  it("mencatat audit log lengkap (aktor, target, e-mail lama & baru)", async () => {
    await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    expect(mockAudit).toHaveBeenCalledWith({
      actorId: "sa-1",
      actorName: "Super Admin",
      action: "change-email",
      targetUserId: TARGET_ID,
      targetName: "Admin Jurusan",
      detail: { oldEmail: "lama@gmail.com", newEmail: "baru@gmail.com" },
    });
  });

  it("nama aktor jatuh ke e-mail lalu 'SuperAdmin' jika nama kosong", async () => {
    mockSession.mockResolvedValue({ user: { id: "sa-1", role: "SuperAdmin", name: null, email: "sa@gmail.com" } });
    await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);
    expect(mockAudit.mock.calls[0][0].actorName).toBe("sa@gmail.com");

    mockAudit.mockClear();
    mockSession.mockResolvedValue({ user: { id: "sa-1", role: "SuperAdmin", name: null, email: null } });
    await PATCH(buatRequest({ newEmail: "baru2@gmail.com" }), ctx);
    expect(mockAudit.mock.calls[0][0].actorName).toBe("SuperAdmin");
  });

  it("tetap 200 jika pemberitahuan ke e-mail lama gagal (tidak membatalkan perubahan)", async () => {
    mockSendNotice.mockRejectedValue(new Error("SMTP down"));

    const res = await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    expect(res.status).toBe(200);
    expect(mockAudit).toHaveBeenCalledTimes(1);
    expect(mockAudit.mock.calls[0][0].detail).toEqual({ oldEmail: "lama@gmail.com", newEmail: "baru@gmail.com" });
  });
});

describe("PATCH /api/account/[id]/email - gagal kirim link reset", () => {
  it("207: e-mail tetap berubah, audit log ditandai resetEmailFailed, notifikasi e-mail lama tidak dikirim", async () => {
    mockSendReset.mockRejectedValue(new Error("SMTP down"));

    const res = await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);
    const json = await res.json();

    expect(res.status).toBe(207);
    expect(json.message).toContain("gagal mengirim link atur ulang kata sandi");
    expect(json.data.email).toBe("baru@gmail.com");
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSendNotice).not.toHaveBeenCalled();
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "change-email",
        detail: { oldEmail: "lama@gmail.com", newEmail: "baru@gmail.com", resetEmailFailed: true },
      })
    );
  });
});

describe("PATCH /api/account/[id]/email - error server", () => {
  it("500 jika update database gagal, tanpa mengirim email apa pun", async () => {
    mockUpdate.mockRejectedValue(new Error("DB down"));

    const res = await PATCH(buatRequest({ newEmail: "baru@gmail.com" }), ctx);

    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe("Terjadi kesalahan server");
    expect(mockSendReset).not.toHaveBeenCalled();
    expect(mockSendNotice).not.toHaveBeenCalled();
  });
});
