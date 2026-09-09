import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jurusan: { findUnique: vi.fn() },
    sMK: { findUnique: vi.fn() },
    produk: { findMany: vi.fn() },
    jasa: { findMany: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getProdukList } from "@/lib/getdata/get-produk";
import { getJasaList } from "@/lib/getdata/get-jasa";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedRedirect = vi.mocked(redirect);
const jurusanFindUnique = prisma.jurusan.findUnique as unknown as ReturnType<typeof vi.fn>;
const smkFindUnique = prisma.sMK.findUnique as unknown as ReturnType<typeof vi.fn>;
const produkFindMany = prisma.produk.findMany as unknown as ReturnType<typeof vi.fn>;
const jasaFindMany = prisma.jasa.findMany as unknown as ReturnType<typeof vi.fn>;

function sesiAdminJurusan(userId = "user-jurusan-1"): Session {
  return { user: { id: userId, role: "AdminJurusan" } } as unknown as Session;
}

function sesiAdminSMK(userId = "user-smk-1"): Session {
  return { user: { id: userId, role: "AdminSMK" } } as unknown as Session;
}

function sesiRole(role: string, userId = "u1"): Session {
  return { user: { id: userId, role } } as unknown as Session;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProdukList — isolasi data tenant", () => {
  it("AdminJurusan hanya melihat produk milik jurusan_id miliknya sendiri", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-1"));
    jurusanFindUnique.mockResolvedValue({ jurusan_id: "jurusan-A" });
    produkFindMany.mockResolvedValue([]);

    await getProdukList();

    expect(jurusanFindUnique).toHaveBeenCalledWith({ where: { user_id: "user-jurusan-1" } });
    expect(produkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          jurusan_id: { in: ["jurusan-A"] },
        }),
      })
    );
  });

  it("AdminSMK melihat produk dari SEMUA jurusan di bawah SMK-nya, bukan jurusan lain", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-1"));
    smkFindUnique.mockResolvedValue({
      jurusans: [{ jurusan_id: "jurusan-A" }, { jurusan_id: "jurusan-B" }],
    });
    produkFindMany.mockResolvedValue([]);

    await getProdukList();

    expect(produkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          jurusan_id: { in: ["jurusan-A", "jurusan-B"] },
        }),
      })
    );
  });

  it("AdminJurusan tanpa data Jurusan (belum lengkap profil) -> hasil kosong, TIDAK query produk semua jurusan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan());
    jurusanFindUnique.mockResolvedValue(null);

    const hasil = await getProdukList();

    expect(hasil).toEqual([]);
    expect(produkFindMany).not.toHaveBeenCalled();
  });

  it("AdminSMK yang belum punya jurusan sama sekali -> hasil kosong, TIDAK query produk dengan filter kosong (yang berarti 'semua produk')", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK());
    smkFindUnique.mockResolvedValue({ jurusans: [] });

    const hasil = await getProdukList();

    expect(hasil).toEqual([]);
    expect(produkFindMany).not.toHaveBeenCalled();
  });

  it("role selain AdminJurusan/AdminSMK (mis. 'User') ditolak dan diarahkan ke login sebelum sempat query data", async () => {
    mockedGetServerSession.mockResolvedValue(sesiRole("User", "u1"));

    await expect(getProdukList()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockedRedirect).toHaveBeenCalledWith("/auth/login");
    expect(jurusanFindUnique).not.toHaveBeenCalled();
    expect(produkFindMany).not.toHaveBeenCalled();
  });

  it("tidak ada sesi sama sekali -> diarahkan ke login, tidak ada query data yang bocor", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    await expect(getProdukList()).rejects.toThrow("NEXT_REDIRECT");
    expect(produkFindMany).not.toHaveBeenCalled();
  });
});

describe("getJasaList — isolasi data tenant", () => {
  it("AdminJurusan hanya melihat jasa dari produk yang jurusan_id-nya miliknya sendiri", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-1"));
    jurusanFindUnique.mockResolvedValue({ jurusan_id: "jurusan-A" });
    jasaFindMany.mockResolvedValue([]);

    await getJasaList();

    expect(jasaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { produk: { jurusan_id: { in: ["jurusan-A"] } } },
      })
    );
  });

  it("AdminSMK melihat jasa dari semua jurusan di SMK-nya saja, bukan SMK lain", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-1"));
    smkFindUnique.mockResolvedValue({
      jurusans: [{ jurusan_id: "jurusan-A" }, { jurusan_id: "jurusan-B" }],
    });
    jasaFindMany.mockResolvedValue([]);

    await getJasaList();

    expect(jasaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { produk: { jurusan_id: { in: ["jurusan-A", "jurusan-B"] } } },
      })
    );
  });

  it("AdminJurusan tanpa data Jurusan -> hasil kosong, TIDAK query jasa jurusan lain", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan());
    jurusanFindUnique.mockResolvedValue(null);

    const hasil = await getJasaList();

    expect(hasil).toEqual([]);
    expect(jasaFindMany).not.toHaveBeenCalled();
  });

  it("role tidak berwenang ditolak sebelum sempat mengambil data jasa", async () => {
    mockedGetServerSession.mockResolvedValue(sesiRole("User", "u1"));

    await expect(getJasaList()).rejects.toThrow("NEXT_REDIRECT");
    expect(jasaFindMany).not.toHaveBeenCalled();
  });
});