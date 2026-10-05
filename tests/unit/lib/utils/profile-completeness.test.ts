import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sMK: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { isProfileComplete, checkProfileCompleteness } from "@/lib/utils/profile-completeness";

type FindUniqueMock = ReturnType<typeof vi.fn>;
const smkFindUnique = prisma.sMK.findUnique as unknown as FindUniqueMock;
const userFindUnique = prisma.user.findUnique as unknown as FindUniqueMock;

const smkLengkap = {
  alamat: "Jl. Pendidikan No. 1",
  kota: "Lumajang",
  provinsi: "Jawa Timur",
  kota_id: 123,
  tahun_berdiri: 1990,
  latitude: -8.13,
  longitude: 113.22,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isProfileComplete — AdminSMK", () => {
  it("lengkap jika alamat, kota, provinsi, kota_id, tahun berdiri, dan koordinat terisi", () => {
    expect(isProfileComplete("AdminSMK", smkLengkap)).toBe(true);
  });

  it.each(["alamat", "kota", "provinsi", "kota_id", "tahun_berdiri", "latitude", "longitude"] as const)(
    "TIDAK lengkap jika %s kosong (null)",
    (field) => {
      expect(isProfileComplete("AdminSMK", { ...smkLengkap, [field]: null })).toBe(false);
    }
  );

  it("koordinat bernilai 0 dianggap terisi (bukan kosong)", () => {
    expect(isProfileComplete("AdminSMK", { ...smkLengkap, latitude: 0, longitude: 0 })).toBe(true);
  });

  it("data profil tidak ditemukan (null) -> tidak lengkap", () => {
    expect(isProfileComplete("AdminSMK", null)).toBe(false);
  });
});

describe("isProfileComplete — AdminJurusan & role lain", () => {
  it("AdminJurusan lengkap jika nomor telepon terisi", () => {
    expect(isProfileComplete("AdminJurusan", { phone: "0812xxxx" })).toBe(true);
  });

  it("AdminJurusan TIDAK lengkap jika nomor telepon kosong", () => {
    expect(isProfileComplete("AdminJurusan", { phone: null })).toBe(false);
  });

  it("role selain AdminSMK/AdminJurusan selalu dianggap lengkap, tapi data null tetap tidak lengkap", () => {
    expect(isProfileComplete("SuperAdmin" as never, {})).toBe(true);
    expect(isProfileComplete("SuperAdmin" as never, null)).toBe(false);
  });
});

describe("checkProfileCompleteness (membaca database)", () => {
  it("AdminSMK: membaca data SMK milik user tsb lalu menilai kelengkapannya", async () => {
    smkFindUnique.mockResolvedValue(smkLengkap);

    const hasil = await checkProfileCompleteness("user-s1", "AdminSMK");

    expect(smkFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: "user-s1" } })
    );
    expect(hasil).toBe(true);
  });

  it("AdminSMK: data SMK belum ada di database -> tidak lengkap", async () => {
    smkFindUnique.mockResolvedValue(null);

    expect(await checkProfileCompleteness("user-s1", "AdminSMK")).toBe(false);
  });

  it("AdminJurusan: yang dicek adalah nomor telepon pada akun user-nya", async () => {
    userFindUnique.mockResolvedValue({ phone: "0812xxxx" });

    const hasil = await checkProfileCompleteness("user-j1", "AdminJurusan");

    expect(userFindUnique).toHaveBeenCalledWith({
      where: { user_id: "user-j1" },
      select: { phone: true },
    });
    expect(hasil).toBe(true);
  });

  it("AdminJurusan tanpa nomor telepon -> tidak lengkap", async () => {
    userFindUnique.mockResolvedValue({ phone: null });

    expect(await checkProfileCompleteness("user-j1", "AdminJurusan")).toBe(false);
  });

  it("role lain -> dianggap lengkap tanpa menyentuh database", async () => {
    const hasil = await checkProfileCompleteness("user-sa", "SuperAdmin" as never);

    expect(hasil).toBe(true);
    expect(smkFindUnique).not.toHaveBeenCalled();
    expect(userFindUnique).not.toHaveBeenCalled();
  });
});
