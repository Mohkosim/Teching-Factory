// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));

const { GET } = await import("@/app/api/account/email-availability/route");
const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

const mockSession = vi.mocked(getServerSession) as unknown as ReturnType<typeof vi.fn>;
const mockFind = vi.mocked(prisma.user.findUnique) as unknown as ReturnType<typeof vi.fn>;

function buatRequest(query: string) {
  return new NextRequest(`http://localhost:3000/api/account/email-availability${query}`);
}

beforeEach(() => {
  mockSession.mockReset();
  mockFind.mockReset();
  mockSession.mockResolvedValue({ user: { id: "sa-1", role: "SuperAdmin" } });
});

describe("GET /api/account/email-availability", () => {
  it("401 jika belum login", async () => {
    mockSession.mockResolvedValue(null);

    const res = await GET(buatRequest("?email=a@gmail.com"));

    expect(res.status).toBe(401);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("401 jika bukan SuperAdmin", async () => {
    mockSession.mockResolvedValue({ user: { id: "u", role: "User" } });

    const res = await GET(buatRequest("?email=a@gmail.com"));

    expect(res.status).toBe(401);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it.each(["", "?email=bukan-email"])("400 untuk query %j", async (query) => {
    const res = await GET(buatRequest(query));

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("E-mail tidak valid");
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("available: true jika e-mail belum dipakai siapa pun", async () => {
    mockFind.mockResolvedValue(null);

    const res = await GET(buatRequest("?email=baru@gmail.com"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: true });
  });

  it("available: false jika e-mail dipakai akun lain", async () => {
    mockFind.mockResolvedValue({ user_id: "orang-lain" });

    const res = await GET(buatRequest("?email=dipakai@gmail.com&excludeUserId=target-1"));

    expect(await res.json()).toEqual({ available: false });
  });

  it("available: true jika e-mail itu milik akun yang sedang diedit (excludeUserId)", async () => {
    mockFind.mockResolvedValue({ user_id: "target-1" });

    const res = await GET(buatRequest("?email=lama@gmail.com&excludeUserId=target-1"));

    expect(await res.json()).toEqual({ available: true });
  });

  it("e-mail dinormalisasi (huruf kecil & spasi dibuang) sebelum dicari", async () => {
    mockFind.mockResolvedValue(null);

    await GET(buatRequest("?email=%20Baru@Gmail.COM%20"));

    expect(mockFind).toHaveBeenCalledWith({
      where: { email: "baru@gmail.com" },
      select: { user_id: true },
    });
  });
});
