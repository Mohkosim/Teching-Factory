import { describe, it, expect, vi, beforeEach } from "vitest";

type MockUserRow = {
    user_id: string;
    email: string;
    password: string;
    isActive: boolean;
    name: string;
    role: string;
    image: string | null;
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

const { authOptions } = await import("@/lib/auth");
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

beforeEach(() => {
    mockFindUnique.mockReset();
    mockCompare.mockReset();
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
        mockFindUnique.mockResolvedValue({
            user_id: "1",
            email: "user@gmail.com",
            password: "hash-di-database",
            isActive: true,
            name: "User Satu",
            role: "User",
            image: null,
        });
        mockCompare.mockResolvedValue(false);

        const hasil = await authorize({
            email: "user@gmail.com",
            password: "salahPassword",
        });

        expect(hasil).toBeNull();
    });

    it("gagal jika akun sudah dinonaktifkan (isActive = false)", async () => {
        mockFindUnique.mockResolvedValue({
            user_id: "1",
            email: "user@gmail.com",
            password: "hash-di-database",
            isActive: false,
            name: "User Satu",
            role: "User",
            image: null,
        });
        mockCompare.mockResolvedValue(true);

        await expect(
            authorize({ email: "user@gmail.com", password: "passwordBenar" })
        ).rejects.toThrow("AccountDisabled");
    });

    it("berhasil login jika email terdaftar, password benar, dan akun aktif", async () => {
        mockFindUnique.mockResolvedValue({
            user_id: "1",
            email: "user@gmail.com",
            password: "hash-di-database",
            isActive: true,
            name: "User Satu",
            role: "User",
            image: null,
        });
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