import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type MockUserRow = {
  user_id: string;
  email: string;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mail", () => ({
  sendResetPasswordEmail: vi.fn(),
}));

const { POST } = await import("@/app/api/auth/forgot-password/route");
const { prisma } = await import("@/lib/prisma");
const { sendResetPasswordEmail } = await import("@/lib/mail");

const mockFindUnique = vi.mocked(
  prisma.user.findUnique as unknown as (
    args: unknown
  ) => Promise<MockUserRow | null>
);
const mockUpdate = vi.mocked(
  prisma.user.update as unknown as (args: {
    where: { email: string };
    data: { resetToken: string; resetTokenExpiry: Date };
  }) => Promise<MockUserRow>
);
const mockSendEmail = vi.mocked(sendResetPasswordEmail);

function buatRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const emailValid = "user@gmail.com";

beforeEach(() => {
  mockFindUnique.mockReset();
  mockUpdate.mockReset();
  mockSendEmail.mockReset();
});

describe("POST /api/auth/forgot-password", () => {
  it("gagal (400) jika format email tidak valid", async () => {
    const res = await POST(buatRequest({ email: "bukan-email" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Format e-mail tidak valid");
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("email tidak terdaftar -> tetap 200 dengan pesan generik (tidak bocorkan info akun)", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(buatRequest({ email: emailValid }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Jika email terdaftar, instruksi akan dikirim.");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("email terdaftar -> resetToken disimpan & email reset dikirim", async () => {
    mockFindUnique.mockResolvedValue({
      user_id: "1",
      email: emailValid,
      resetToken: null,
      resetTokenExpiry: null,
    });
    mockUpdate.mockResolvedValue({
      user_id: "1",
      email: emailValid,
      resetToken: "token-acak",
      resetTokenExpiry: new Date(),
    });
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST(buatRequest({ email: emailValid }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Jika email terdaftar, instruksi akan dikirim.");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { email: emailValid },
      data: {
        resetToken: expect.any(String),
        resetTokenExpiry: expect.any(Date),
      },
    });
    expect(mockSendEmail).toHaveBeenCalledWith(
      emailValid,
      expect.stringContaining("/auth/reset-password?token=")
    );
  });

  it("gagal (500) jika pengiriman email gagal", async () => {
    mockFindUnique.mockResolvedValue({
      user_id: "1",
      email: emailValid,
      resetToken: null,
      resetTokenExpiry: null,
    });
    mockUpdate.mockResolvedValue({
      user_id: "1",
      email: emailValid,
      resetToken: "token-acak",
      resetTokenExpiry: new Date(),
    });
    mockSendEmail.mockRejectedValue(new Error("SMTP error"));

    const res = await POST(buatRequest({ email: emailValid }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).toBe("Gagal mengirim email, coba lagi nanti.");
  });

  it("gagal (500) jika terjadi error tak terduga di database", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(buatRequest({ email: emailValid }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).toBe("Terjadi kesalahan server");
  });
});