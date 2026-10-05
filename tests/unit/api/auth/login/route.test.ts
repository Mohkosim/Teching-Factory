import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type MockUserRow = {
  user_id: string;
  email: string;
  password: string;
  isActive: boolean;
  name: string;
  role: string;
  img: string | null;
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

const { POST } = await import("@/app/api/auth/login/route");
const { prisma } = await import("@/lib/prisma");
const bcrypt = (await import("bcryptjs")).default;

const mockFindUnique = vi.mocked(
  prisma.user.findUnique as unknown as (
    args: unknown
  ) => Promise<MockUserRow | null>
);
const mockCompare = vi.mocked(
  bcrypt.compare as unknown as (
    password: string,
    hash: string
  ) => Promise<boolean>
);

function buatRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const payloadValid = { email: "user@gmail.com", password: "password123" };

beforeEach(() => {
  mockFindUnique.mockReset();
  mockCompare.mockReset();
});

describe("POST /api/auth/login", () => {
  it("gagal (400) jika payload tidak lolos validasi Zod", async () => {
    const res = await POST(buatRequest({ email: "bukan-email", password: "123" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Format e-mail tidak valid");
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("gagal (401) jika email tidak terdaftar", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(buatRequest(payloadValid));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.message).toBe("E-mail atau kata sandi salah");
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("gagal (401) jika password salah", async () => {
    mockFindUnique.mockResolvedValue({
      user_id: "1",
      email: payloadValid.email,
      password: "hash-di-database",
      isActive: true,
      name: "User Satu",
      role: "User",
      img: null,
    });
    mockCompare.mockResolvedValue(false);

    const res = await POST(buatRequest(payloadValid));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.message).toBe("E-mail atau kata sandi salah");
  });

  it("berhasil (200) jika email & password benar", async () => {
    mockFindUnique.mockResolvedValue({
      user_id: "1",
      email: payloadValid.email,
      password: "hash-di-database",
      isActive: true,
      name: "User Satu",
      role: "User",
      img: null,
    });
    mockCompare.mockResolvedValue(true);

    const res = await POST(buatRequest(payloadValid));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Login berhasil");
  });

  it("gagal (500) jika terjadi error tak terduga", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(buatRequest(payloadValid));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).toBe("Terjadi kesalahan server");
  });
});