import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { proxy } from "@/proxy";
import { getToken } from "next-auth/jwt";
import { checkProfileCompleteness } from "@/lib/utils/profile-completeness";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

// Cek kelengkapan profil admin membaca database -> di-mock supaya test tidak butuh DB.
vi.mock("@/lib/utils/profile-completeness", () => ({
  checkProfileCompleteness: vi.fn(),
}));

const mockedGetToken = vi.mocked(getToken);
const mockedCheckProfile = vi.mocked(checkProfileCompleteness);

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
  mockedCheckProfile.mockReset();
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

describe("proxy — isolasi tenant AdminJurusan (slug SMK & jurusan)", () => {
  const tokenJurusan = () =>
    mockToken({
      role: "AdminJurusan",
      id: "user-j1",
      smkSlug: "smk-a",
      jurusanSlug: "rpl",
    });

  it("AdminJurusan mencoba membuka jurusan lain di SMK yang sama -> dipaksa balik ke jurusannya", async () => {
    mockedGetToken.mockResolvedValue(tokenJurusan());
    const res = await proxy(buatRequest("/dashboard/adminJurusan/smk-a/tkj"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard/adminJurusan/smk-a/rpl");
  });

  it("AdminJurusan mencoba membuka SMK lain -> dipaksa balik ke SMK & jurusannya", async () => {
    mockedGetToken.mockResolvedValue(tokenJurusan());
    const res = await proxy(buatRequest("/dashboard/adminJurusan/smk-b/rpl"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard/adminJurusan/smk-a/rpl");
  });

  it("role User mencoba membuka dashboard AdminJurusan -> ditolak (/unauthorized)", async () => {
    mockedGetToken.mockResolvedValue(mockToken({ role: "User", id: "u1" }));
    const res = await proxy(buatRequest("/dashboard/adminJurusan/smk-a/rpl"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/unauthorized");
  });

  it("AdminSMK mencoba masuk dashboard AdminJurusan -> ditolak (/unauthorized)", async () => {
    mockedGetToken.mockResolvedValue(mockToken({ role: "AdminSMK", id: "s1", smkSlug: "smk-a" }));
    const res = await proxy(buatRequest("/dashboard/adminJurusan/smk-a/rpl"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/unauthorized");
  });

  it("SuperAdmin boleh membuka dashboard AdminSMK & AdminJurusan mana pun, tanpa cek kelengkapan profil", async () => {
    mockedGetToken.mockResolvedValue(mockToken({ role: "SuperAdmin", id: "sa1" }));

    const resSmk = await proxy(buatRequest("/dashboard/adminSMK/smk-a/productManagement"));
    const resJurusan = await proxy(buatRequest("/dashboard/adminJurusan/smk-a/rpl/orderManagement"));

    expect(resSmk.status).toBe(200);
    expect(resJurusan.status).toBe(200);
    expect(mockedCheckProfile).not.toHaveBeenCalled();
  });
});

describe("proxy — kunci fitur dashboard sampai profil admin lengkap", () => {
  const tokenSmk = () => mockToken({ role: "AdminSMK", id: "user-s1", smkSlug: "smk-a" });
  const tokenJurusan = () =>
    mockToken({ role: "AdminJurusan", id: "user-j1", smkSlug: "smk-a", jurusanSlug: "rpl" });

  it("AdminSMK dengan profil BELUM lengkap membuka fitur lain -> diarahkan ke halaman Profile", async () => {
    mockedGetToken.mockResolvedValue(tokenSmk());
    mockedCheckProfile.mockResolvedValue(false);

    const res = await proxy(buatRequest("/dashboard/adminSMK/smk-a/productManagement"));

    expect(mockedCheckProfile).toHaveBeenCalledWith("user-s1", "AdminSMK");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard/adminSMK/smk-a/profile");
  });

  it("AdminSMK dengan profil lengkap membuka fitur lain -> diizinkan", async () => {
    mockedGetToken.mockResolvedValue(tokenSmk());
    mockedCheckProfile.mockResolvedValue(true);

    const res = await proxy(buatRequest("/dashboard/adminSMK/smk-a/productManagement"));

    expect(res.status).toBe(200);
  });

  it.each([
    ["dashboard utama", "/dashboard/adminSMK/smk-a"],
    ["halaman Profile", "/dashboard/adminSMK/smk-a/profile"],
  ])("AdminSMK dengan profil belum lengkap tetap boleh membuka %s (tanpa cek database)", async (_nama, path) => {
    mockedGetToken.mockResolvedValue(tokenSmk());
    mockedCheckProfile.mockResolvedValue(false);

    const res = await proxy(buatRequest(path));

    expect(res.status).toBe(200);
    expect(mockedCheckProfile).not.toHaveBeenCalled();
  });

  it("AdminJurusan dengan profil BELUM lengkap membuka fitur lain -> diarahkan ke halaman Profile jurusannya", async () => {
    mockedGetToken.mockResolvedValue(tokenJurusan());
    mockedCheckProfile.mockResolvedValue(false);

    const res = await proxy(buatRequest("/dashboard/adminJurusan/smk-a/rpl/orderManagement"));

    expect(mockedCheckProfile).toHaveBeenCalledWith("user-j1", "AdminJurusan");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard/adminJurusan/smk-a/rpl/profile");
  });

  it("AdminJurusan dengan profil lengkap membuka fitur lain -> diizinkan", async () => {
    mockedGetToken.mockResolvedValue(tokenJurusan());
    mockedCheckProfile.mockResolvedValue(true);

    const res = await proxy(buatRequest("/dashboard/adminJurusan/smk-a/rpl/orderManagement"));

    expect(res.status).toBe(200);
  });

  it.each([
    ["dashboard utama", "/dashboard/adminJurusan/smk-a/rpl"],
    ["halaman Profile", "/dashboard/adminJurusan/smk-a/rpl/profile"],
  ])("AdminJurusan dengan profil belum lengkap tetap boleh membuka %s (tanpa cek database)", async (_nama, path) => {
    mockedGetToken.mockResolvedValue(tokenJurusan());
    mockedCheckProfile.mockResolvedValue(false);

    const res = await proxy(buatRequest(path));

    expect(res.status).toBe(200);
    expect(mockedCheckProfile).not.toHaveBeenCalled();
  });
});

describe("proxy — pemisahan halaman publik (guest) dan area admin", () => {
  it.each(["AdminSMK", "AdminJurusan", "SuperAdmin"])(
    "role %s membuka halaman publik /produk -> diarahkan ke dashboard-nya, bukan etalase pembeli",
    async (role) => {
      mockedGetToken.mockResolvedValue(
        mockToken({ role, id: "x1", smkSlug: "smk-a", jurusanSlug: "rpl" })
      );

      const res = await proxy(buatRequest("/produk"));

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/dashboard/");
    }
  );

  it("role 'User' (pembeli) tetap boleh membuka halaman publik", async () => {
    mockedGetToken.mockResolvedValue(mockToken({ role: "User", id: "u1" }));
    const res = await proxy(buatRequest("/produk"));
    expect(res.status).toBe(200);
  });

  it("tamu membuka /keranjang (butuh login) -> diarahkan ke /auth/login", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await proxy(buatRequest("/keranjang"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });

  it("tamu boleh membuka halaman auth (login/register/verifikasi OTP)", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await proxy(buatRequest("/auth/verify-otp"));
    expect(res.status).toBe(200);
  });

  it.each(["/api/produk", "/_next/static/chunk.js", "/img/logo.png"])(
    "path %s (API / aset statis) dilewati tanpa cek token",
    async (path) => {
      const res = await proxy(buatRequest(path));
      expect(res.status).toBe(200);
      expect(mockedGetToken).not.toHaveBeenCalled();
    }
  );
});

describe("proxy - halaman Status Pengajuan Mitra", () => {
  it("belum login -> diarahkan ke login dengan callbackUrl ke halaman pengajuan", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await proxy(buatRequest("/profile/pengajuan-mitra"));

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("callbackUrl")).toBe("/profile/pengajuan-mitra");
  });

  it("sudah login sebagai User -> halaman diizinkan", async () => {
    mockedGetToken.mockResolvedValue(mockToken({ role: "User", id: "u1" }));
    const res = await proxy(buatRequest("/profile/pengajuan-mitra"));
    expect(res.status).toBe(200);
  });
});
