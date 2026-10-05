import { describe, it, expect, vi, beforeEach } from "vitest";

type MockUserRow = {
    user_id: string;
    email: string;
    password: string;
    isActive: boolean;
    isVerified: boolean;
    name: string;
    role: string;
    img: string | null; // nama kolom di database (di sesi NextAuth jadi "image")
};

type AuthorizedUser = {
    id: string;
    email: string;
    name: string;
    role: string;
    image: string | null;
} | null;

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

// Tiket login hasil verifikasi OTP (dipakai provider "otp-ticket").
// Di-mock supaya test tidak butuh NEXTAUTH_SECRET / enkripsi JWT sungguhan.
vi.mock("@/lib/utils/otp-login-ticket", () => ({
    verifyOtpLoginTicket: vi.fn(),
}));

const { authOptions } = await import("@/lib/auth");
const { prisma } = await import("@/lib/prisma");
const bcrypt = (await import("bcryptjs")).default;
const { verifyOtpLoginTicket } = await import("@/lib/utils/otp-login-ticket");

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

type CredentialsProviderLike = {
    options: {
        authorize: (
            credentials: Record<"email" | "password", string> | undefined
        ) => Promise<AuthorizedUser>;
    };
};

const credentialsProvider = authOptions
    .providers[0] as unknown as CredentialsProviderLike;
const authorize = credentialsProvider.options.authorize;

// Provider ke-3: login otomatis setelah verifikasi OTP (id = "otp-ticket").
type OtpTicketProviderLike = {
    options: {
        id?: string;
        authorize: (
            credentials: { ticket?: string } | undefined
        ) => Promise<AuthorizedUser>;
    };
};

const otpTicketProvider = (
    authOptions.providers as unknown as OtpTicketProviderLike[]
).find((p) => p.options?.id === "otp-ticket");
const authorizeOtpTicket = otpTicketProvider!.options.authorize;

const mockVerifyTicket = vi.mocked(
    verifyOtpLoginTicket as unknown as (ticket: string) => Promise<string | null>
);

function userDb(overrides: Partial<MockUserRow> = {}): MockUserRow {
    return {
        user_id: "1",
        email: "user@gmail.com",
        password: "hash-di-database",
        isActive: true,
        isVerified: true,
        name: "User Satu",
        role: "User",
        img: null,
        ...overrides,
    };
}

beforeEach(() => {
    mockFindUnique.mockReset();
    mockCompare.mockReset();
    mockVerifyTicket.mockReset();
});

describe("authorize (bisa login atau tidak)", () => {
    it("gagal jika email atau password tidak dikirim sama sekali", async () => {
        const hasil = await authorize(undefined);
        expect(hasil).toBeNull();
    });

    it("gagal jika email tidak terdaftar di database", async () => {
        mockFindUnique.mockResolvedValue(null);

        const hasil = await authorize({
            email: "tidakada@gmail.com",
            password: "password123",
        });

        expect(hasil).toBeNull();
    });

    it("gagal jika password salah", async () => {
        mockFindUnique.mockResolvedValue(userDb());
        mockCompare.mockResolvedValue(false);

        const hasil = await authorize({
            email: "user@gmail.com",
            password: "salahPassword",
        });

        expect(hasil).toBeNull();
    });

    it("gagal jika akun sudah dinonaktifkan (isActive = false)", async () => {
        mockFindUnique.mockResolvedValue(userDb({ isActive: false }));
        mockCompare.mockResolvedValue(true);

        await expect(
            authorize({ email: "user@gmail.com", password: "passwordBenar" })
        ).rejects.toThrow("AccountDisabled");
    });

    it("gagal (EmailNotVerified) jika role 'User' belum memverifikasi email lewat OTP", async () => {
        mockFindUnique.mockResolvedValue(userDb({ isVerified: false }));
        mockCompare.mockResolvedValue(true);

        await expect(
            authorize({ email: "user@gmail.com", password: "passwordBenar" })
        ).rejects.toThrow("EmailNotVerified");
    });

    it("password salah pada akun belum terverifikasi -> tetap null (status verifikasi tidak bocor ke penebak password)", async () => {
        mockFindUnique.mockResolvedValue(userDb({ isVerified: false }));
        mockCompare.mockResolvedValue(false);

        const hasil = await authorize({
            email: "user@gmail.com",
            password: "salahPassword",
        });

        expect(hasil).toBeNull();
    });

    it("akun nonaktif DAN belum terverifikasi -> yang dilaporkan AccountDisabled (cek aktif lebih dulu)", async () => {
        mockFindUnique.mockResolvedValue(userDb({ isActive: false, isVerified: false }));
        mockCompare.mockResolvedValue(true);

        await expect(
            authorize({ email: "user@gmail.com", password: "passwordBenar" })
        ).rejects.toThrow("AccountDisabled");
    });

    it.each(["AdminSMK", "AdminJurusan", "SuperAdmin"])(
        "role %s tidak diwajibkan verifikasi OTP -> tetap bisa login walau isVerified = false",
        async (role) => {
            mockFindUnique.mockResolvedValue(userDb({ role, isVerified: false }));
            mockCompare.mockResolvedValue(true);

            const hasil = await authorize({
                email: "user@gmail.com",
                password: "passwordBenar",
            });

            expect(hasil?.role).toBe(role);
        }
    );

    it("email dinormalisasi (trim + huruf kecil) sebelum dicari di database", async () => {
        mockFindUnique.mockResolvedValue(null);

        await authorize({ email: "  User@Gmail.COM ", password: "apapun" });

        expect(mockFindUnique).toHaveBeenCalledWith({
            where: { email: "user@gmail.com" },
        });
    });

    it("berhasil login jika email terdaftar, password benar, akun aktif, dan email terverifikasi", async () => {
        mockFindUnique.mockResolvedValue(userDb());
        mockCompare.mockResolvedValue(true);

        const hasil = await authorize({
            email: "user@gmail.com",
            password: "passwordBenar",
        });

        expect(hasil).not.toBeNull();
        expect(hasil?.id).toBe("1");
        expect(hasil?.role).toBe("User");
    });
});

describe("authorize provider 'otp-ticket' (login otomatis setelah verifikasi OTP)", () => {
    it("provider otp-ticket terdaftar di authOptions", () => {
        expect(otpTicketProvider).toBeDefined();
    });

    it("gagal jika tiket tidak dikirim", async () => {
        const hasil = await authorizeOtpTicket(undefined);

        expect(hasil).toBeNull();
        expect(mockVerifyTicket).not.toHaveBeenCalled();
    });

    it("gagal jika tiket tidak valid / kedaluwarsa (verifikasi mengembalikan null)", async () => {
        mockVerifyTicket.mockResolvedValue(null);

        const hasil = await authorizeOtpTicket({ ticket: "tiket-palsu" });

        expect(hasil).toBeNull();
        expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("gagal jika user dari tiket tidak ada di database", async () => {
        mockVerifyTicket.mockResolvedValue("1");
        mockFindUnique.mockResolvedValue(null);

        const hasil = await authorizeOtpTicket({ ticket: "tiket-valid" });

        expect(hasil).toBeNull();
    });

    it("gagal jika email user belum terverifikasi (tiket saja tidak cukup)", async () => {
        mockVerifyTicket.mockResolvedValue("1");
        mockFindUnique.mockResolvedValue(userDb({ isVerified: false }));

        const hasil = await authorizeOtpTicket({ ticket: "tiket-valid" });

        expect(hasil).toBeNull();
    });

    it("gagal (AccountDisabled) jika akun sudah dinonaktifkan", async () => {
        mockVerifyTicket.mockResolvedValue("1");
        mockFindUnique.mockResolvedValue(userDb({ isActive: false }));

        await expect(
            authorizeOtpTicket({ ticket: "tiket-valid" })
        ).rejects.toThrow("AccountDisabled");
    });

    it("berhasil login jika tiket valid, user ada, aktif, dan terverifikasi (dicari lewat user_id dari tiket)", async () => {
        mockVerifyTicket.mockResolvedValue("1");
        mockFindUnique.mockResolvedValue(userDb({ img: "foto.jpg" }));

        const hasil = await authorizeOtpTicket({ ticket: "tiket-valid" });

        expect(mockFindUnique).toHaveBeenCalledWith({ where: { user_id: "1" } });
        expect(hasil).toEqual({
            id: "1",
            name: "User Satu",
            email: "user@gmail.com",
            role: "User",
            image: "foto.jpg", // kolom user.img dipetakan ke image di sesi
        });
    });
});
