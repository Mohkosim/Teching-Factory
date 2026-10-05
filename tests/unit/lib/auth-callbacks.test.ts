import { describe, it, expect, vi, beforeEach } from "vitest";

type MockUserRow = {
  user_id: string;
  email: string;
  password: string;
  isActive: boolean;
  isVerified: boolean;
  name: string;
  role: string;
  img: string | null;
};

type MockJurusanRow = {
  jurusan_id: string;
  nama_jurusan: string;
  smk: { user: { name: string } };
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    jurusan: { findUnique: vi.fn() },
  },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));

const { authOptions } = await import("@/lib/auth");
const { prisma } = await import("@/lib/prisma");
const bcrypt = (await import("bcryptjs")).default;

const mockFindUniqueUser = vi.mocked(
  prisma.user.findUnique as unknown as (
    args: unknown
  ) => Promise<MockUserRow | null>
);
const mockCreateUser = vi.mocked(
  prisma.user.create as unknown as (args: {
    data: Record<string, unknown>;
  }) => Promise<MockUserRow>
);
const mockUpdateUser = vi.mocked(
  prisma.user.update as unknown as (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<MockUserRow>
);
const mockFindUniqueJurusan = vi.mocked(
  prisma.jurusan.findUnique as unknown as (
    args: unknown
  ) => Promise<MockJurusanRow | null>
);
const mockHash = vi.mocked(
  bcrypt.hash as unknown as (
    password: string,
    saltRounds: number
  ) => Promise<string>
);

// Bentuk minimal argumen callback yang benar-benar dipakai di lib/auth.ts.
type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
};

type JwtToken = {
  id?: string;
  role?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  smkSlug?: string;
  jurusanSlug?: string;
};

type AuthCallbacks = {
  signIn: (args: {
    user: SessionUser;
    account: { provider: string } | null;
    profile?: { email_verified?: boolean };
  }) => Promise<boolean>;
  jwt: (args: {
    token: JwtToken;
    user?: SessionUser;
    trigger?: "signIn" | "signUp" | "update";
    session?: Partial<SessionUser>;
  }) => Promise<JwtToken>;
};

const callbacks = authOptions.callbacks as unknown as AuthCallbacks;

beforeEach(() => {
  mockFindUniqueUser.mockReset();
  mockCreateUser.mockReset();
  mockUpdateUser.mockReset();
  mockFindUniqueJurusan.mockReset();
  mockHash.mockReset();
});

describe("callback signIn (login via Google)", () => {
  it("login non-Google (Credentials) -> lolos tanpa sentuh database", async () => {
    const hasil = await callbacks.signIn({
      user: { id: "1", email: "user@gmail.com" },
      account: { provider: "credentials" },
    });

    expect(hasil).toBe(true);
    expect(mockFindUniqueUser).not.toHaveBeenCalled();
  });

  it("Google login, email sudah ada, aktif & sudah terverifikasi -> data user disamakan dengan yang di database", async () => {
    mockFindUniqueUser.mockResolvedValue({
      user_id: "u1",
      email: "user@gmail.com",
      password: "hash-lama",
      isActive: true,
      isVerified: true,
      name: "Nama Asli",
      role: "AdminSMK",
      img: "foto.jpg",
    });

    const user: SessionUser = {
      id: "google-temp-id",
      email: "user@gmail.com",
      name: "Nama Google",
      image: null,
    };

    const hasil = await callbacks.signIn({ user, account: { provider: "google" } });

    expect(hasil).toBe(true);
    expect(user.id).toBe("u1");
    expect(user.role).toBe("AdminSMK");
    expect(user.name).toBe("Nama Asli");
    expect(user.image).toBe("foto.jpg");
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled(); // sudah terverifikasi -> tidak perlu diubah
  });

  it("Google login, email sudah ada tapi nonaktif -> ditolak", async () => {
    mockFindUniqueUser.mockResolvedValue({
      user_id: "u1",
      email: "user@gmail.com",
      password: "hash-lama",
      isActive: false,
      isVerified: true,
      name: "Nama Asli",
      role: "User",
      img: null,
    });

    const hasil = await callbacks.signIn({
      user: { id: "google-temp-id", email: "user@gmail.com" },
      account: { provider: "google" },
    });

    expect(hasil).toBe(false);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("Google login, email dari Google belum terverifikasi (email_verified = false) -> ditolak tanpa sentuh database", async () => {
    const hasil = await callbacks.signIn({
      user: { id: "google-temp-id", email: "user@gmail.com" },
      account: { provider: "google" },
      profile: { email_verified: false },
    });

    expect(hasil).toBe(false);
    expect(mockFindUniqueUser).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("Google login, alamat email dinormalisasi (trim + huruf kecil) sebelum dicari", async () => {
    mockFindUniqueUser.mockResolvedValue(null);
    mockHash.mockResolvedValue("hash-random");
    mockCreateUser.mockResolvedValue({
      user_id: "u9",
      email: "campur@gmail.com",
      password: "hash-random",
      isActive: true,
      isVerified: true,
      name: "Campur",
      role: "User",
      img: null,
    });

    await callbacks.signIn({
      user: { id: "g", email: "  Campur@Gmail.COM ", name: "Campur" },
      account: { provider: "google" },
    });

    expect(mockFindUniqueUser).toHaveBeenCalledWith({ where: { email: "campur@gmail.com" } });
  });

  it("Google login, email sudah ada tapi BELUM terverifikasi (daftar manual, OTP belum diisi) -> otomatis diverifikasi & sisa OTP dibersihkan", async () => {
    mockFindUniqueUser.mockResolvedValue({
      user_id: "u3",
      email: "user@gmail.com",
      password: "hash-dari-form-daftar",
      isActive: true,
      isVerified: false,
      name: "Nama Dari Form",
      role: "User",
      img: "foto-lama.jpg",
    });
    mockHash.mockResolvedValue("hash-random-baru");
    mockUpdateUser.mockResolvedValue({} as MockUserRow);

    const user: SessionUser = {
      id: "google-temp-id",
      email: "user@gmail.com",
      name: "Nama Google",
      image: "foto-google.jpg",
    };

    const hasil = await callbacks.signIn({
      user,
      account: { provider: "google" },
      profile: { email_verified: true },
    });

    expect(hasil).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith({
      where: { user_id: "u3" },
      data: expect.objectContaining({
        name: "Nama Google",
        password: "hash-random-baru", // password dari form daftar diganti dengan password acak
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpLastSentAt: null,
        otpAttempts: 0,
        regKeyHash: null,
      }),
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(user.id).toBe("u3");
    expect(user.role).toBe("User");
    expect(user.name).toBe("Nama Google");
    expect(user.image).toBe("foto-lama.jpg"); // foto di database diutamakan
  });

  it("Google login, email belum terdaftar -> user baru dibuat dengan role User & password random di-hash", async () => {
    mockFindUniqueUser.mockResolvedValue(null);
    mockHash.mockResolvedValue("hash-random");
    mockCreateUser.mockResolvedValue({
      user_id: "u2",
      email: "baru@gmail.com",
      password: "hash-random",
      isActive: true,
      isVerified: true,
      name: "User Baru",
      role: "User",
      img: null,
    });

    const user: SessionUser = {
      id: "google-temp-id",
      email: "baru@gmail.com",
      name: "User Baru",
      image: null,
    };

    const hasil = await callbacks.signIn({ user, account: { provider: "google" } });

    expect(hasil).toBe(true);
    expect(mockCreateUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "baru@gmail.com",
        name: "User Baru",
        role: "User",
        isActive: true,
        isVerified: true, // akun Google tidak perlu OTP
      }),
    });
    expect(user.id).toBe("u2");
    expect(user.role).toBe("User");
  });
});

describe("callback jwt (isi token setelah login)", () => {
  it("login role 'User' -> token diisi identitas dasar, tanpa smkSlug", async () => {
    const token = await callbacks.jwt({
      token: {},
      user: {
        id: "1",
        name: "User Satu",
        email: "user@gmail.com",
        image: null,
        role: "User",
      },
    });

    expect(token.id).toBe("1");
    expect(token.role).toBe("User");
    expect(token.smkSlug).toBeUndefined();
    expect(mockFindUniqueJurusan).not.toHaveBeenCalled();
  });

  it("login role 'AdminSMK' -> token.smkSlug dibuat dari nama (slugify)", async () => {
    const token = await callbacks.jwt({
      token: {},
      user: {
        id: "2",
        name: "SMK Negeri 1",
        email: "smk1@gmail.com",
        image: null,
        role: "AdminSMK",
      },
    });

    expect(token.smkSlug).toBe("smk-negeri-1");
  });

  it("login role 'AdminJurusan' -> smkSlug & jurusanSlug diambil dari data Jurusan di database", async () => {
    mockFindUniqueJurusan.mockResolvedValue({
      jurusan_id: "j1",
      nama_jurusan: "Rekayasa Perangkat Lunak",
      smk: { user: { name: "SMK Negeri 1" } },
    });

    const token = await callbacks.jwt({
      token: {},
      user: {
        id: "3",
        name: "Kepala Jurusan",
        email: "adminjurusan@gmail.com",
        image: null,
        role: "AdminJurusan",
      },
    });

    expect(mockFindUniqueJurusan).toHaveBeenCalledWith({
      where: { user_id: "3" },
      include: { smk: { include: { user: true } } },
    });
    expect(token.smkSlug).toBe("smk-negeri-1");
    expect(token.jurusanSlug).toBe("rekayasa-perangkat-lunak");
  });

  it("trigger 'update' pada role AdminSMK -> nama & smkSlug ikut diperbarui", async () => {
    const token = await callbacks.jwt({
      token: { id: "2", role: "AdminSMK", name: "Nama Lama" },
      trigger: "update",
      session: { name: "SMK Negeri Baru" },
    });

    expect(token.name).toBe("SMK Negeri Baru");
    expect(token.smkSlug).toBe("smk-negeri-baru");
  });
});