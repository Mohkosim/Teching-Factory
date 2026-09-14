import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { proxy } from "@/proxy";
import { getToken } from "next-auth/jwt";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

const mockedGetToken = vi.mocked(getToken);

type MockTokenPayload = Partial<JWT> & {
  role?: string;
  smkSlug?: string;
};

function mockToken(payload: MockTokenPayload) {
  return payload as unknown as JWT;
}

function buatRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

beforeEach(() => {
  mockedGetToken.mockReset();
});

describe("proxy (route guard)", () => {
  it("tamu (belum login) mengakses halaman publik -> diizinkan", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await proxy(buatRequest("/produk"));
    expect(res.status).toBe(200); // NextResponse.next()
  });

  it("tamu (belum login) mengakses dashboard -> diarahkan ke /auth/login", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await proxy(buatRequest("/dashboard/superAdmin"));
    expect(res.status).toBe(307); // redirect
    expect(res.headers.get("location")).toContain("/auth/login");
  });

  it("user role 'User' mencoba akses dashboard SuperAdmin -> ditolak (/unauthorized)", async () => {
    mockedGetToken.mockResolvedValue(mockToken({ role: "User" }));
    const res = await proxy(buatRequest("/dashboard/superAdmin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/unauthorized");
  });

  it("role SuperAdmin mengakses dashboard SuperAdmin -> diizinkan", async () => {
    mockedGetToken.mockResolvedValue(mockToken({ role: "SuperAdmin" }));
    const res = await proxy(buatRequest("/dashboard/superAdmin"));
    expect(res.status).toBe(200);
  });

  it("AdminSMK mencoba akses slug SMK milik orang lain -> dipaksa balik ke slug miliknya", async () => {
    mockedGetToken.mockResolvedValue(
      mockToken({
        role: "AdminSMK",
        smkSlug: "smk-milik-saya",
      })
    );
    const res = await proxy(buatRequest("/dashboard/adminSMK/smk-orang-lain"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard/adminSMK/smk-milik-saya");
  });

  it("user yang sudah login membuka halaman /auth/login -> diarahkan sesuai role-nya", async () => {
    mockedGetToken.mockResolvedValue(mockToken({ role: "SuperAdmin" }));
    const res = await proxy(buatRequest("/auth/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard/superAdmin");
  });
});