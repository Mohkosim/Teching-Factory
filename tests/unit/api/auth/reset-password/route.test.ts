import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type MockUserRow = {
  user_id: string;
  email: string;
  password: string;
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

const { POST } = await import("@/app/api/auth/reset-password/route");
const { prisma } = await import("@/lib/prisma");
const bcrypt = (await import("bcryptjs")).default;

const mockFindFirst = vi.mocked(
  prisma.user.findFirst as unknown as (
    args: unknown
  ) => Promise<MockUserRow | null>
);
const mockUpdate = vi.mocked(
  prisma.user.update as unknown as (args: {
    where: { user_id: string };
    data: Record<string, unknown>;
  }) => Promise<MockUserRow>
);
const mockHash = vi.mocked(
  bcrypt.hash as unknown as (
    password: string,
    saltRounds: number
  ) => Promise<string>
);

function buatRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const payloadValid = {
  token: "token-valid",
  password: "PasswordBaru123",
  confirmPassword: "PasswordBaru123",
};

beforeEach(() => {
  mockFindFirst.mockReset();
  mockUpdate.mockReset();
  mockHash.mockReset();
});

describe("POST /api/auth/reset-password", () => {
  it("gagal (400) jika konfirmasi password tidak cocok", async () => {
    const res = await POST(
      buatRequest({ ...payloadValid, confirmPassword: "BedaPassword123" })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Konfirmasi kata sandi tidak cocok");
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("gagal (400) jika token tidak valid atau sudah kedaluwarsa", async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(buatRequest(payloadValid));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Token tidak valid atau sudah kedaluwarsa");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("berhasil (200) mengubah password & menghapus resetToken", async () => {
    mockFindFirst.mockResolvedValue({
      user_id: "1",
      email: "user@gmail.com",
      password: "hash-lama",
    });
    mockHash.mockResolvedValue("hash-baru");
    mockUpdate.mockResolvedValue({
      user_id: "1",
      email: "user@gmail.com",
      password: "hash-baru",
    });

    const res = await POST(buatRequest(payloadValid));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Kata sandi berhasil diubah");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { user_id: "1" },
      data: {
        password: "hash-baru",
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  });

  it("gagal (500) jika terjadi error tak terduga", async () => {
    mockFindFirst.mockRejectedValue(new Error("DB down"));

    const res = await POST(buatRequest(payloadValid));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).toBe("Terjadi kesalahan server");
  });
});