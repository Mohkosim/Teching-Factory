// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pengajuanMitraSMK: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    sMK: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/utils/audit-log", () => ({ recordAuditLog: vi.fn() }));
vi.mock("@/lib/utils/pengajuan-mitra-cleanup", () => ({
  bersihkanPendaftaranSmkKedaluwarsa: vi.fn(),
}));

const { POST, GET } = await import("@/app/api/pengajuan-mitra/route");
const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { recordAuditLog } = await import("@/lib/utils/audit-log");

const m = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const mockSession = m(getServerSession);
const mockFindFirst = m(prisma.pengajuanMitraSMK.findFirst);
const mockFindMany = m(prisma.pengajuanMitraSMK.findMany);
const mockCreate = m(prisma.pengajuanMitraSMK.create);
const mockSmkFind = m(prisma.sMK.findUnique);
const mockAudit = m(recordAuditLog);

const payload = {
  namaSekolah: "SMK Negeri 3 Pamekasan",
  npsn: "20522637",
  namaPenanggungJawab: "Pak Budi",
  noHpPenanggungJawab: "081906906536",
};

function buatPost(body: unknown) {
  return new NextRequest("http://localhost:3000/api/pengajuan-mitra", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const fn of [mockSession, mockFindFirst, mockFindMany, mockCreate, mockSmkFind, mockAudit]) {
    fn.mockReset();
  }
  mockSession.mockResolvedValue({ user: { id: "user-1", role: "User", name: "SMK", email: "smk@gmail.com" } });
  mockFindFirst.mockResolvedValue(null);
  mockSmkFind.mockResolvedValue(null);
  mockCreate.mockImplementation(async ({ data }: { data: object }) => ({ pengajuan_id: "baru-1", ...data }));
  mockAudit.mockResolvedValue(undefined);
});

describe("POST /api/pengajuan-mitra - pengajuan ulang", () => {
  it("menolak jika belum login", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(buatPost(payload));
    expect(res.status).toBe(401);
  });

  it("menolak jika akun sudah memiliki peran admin", async () => {
    mockSession.mockResolvedValue({ user: { id: "u-2", role: "AdminSMK" } });
    const res = await POST(buatPost(payload));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("menolak data tidak valid (NPSN bukan 8 digit)", async () => {
    const res = await POST(buatPost({ ...payload, npsn: "1234567" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.message).toBe("NPSN harus 8 digit");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("menolak jika masih ada pengajuan berstatus Menunggu", async () => {
    mockFindFirst.mockResolvedValue({ pengajuan_id: "lama-1", status: "Menunggu" });
    const res = await POST(buatPost(payload));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("menerima pengajuan ulang setelah ditolak tanpa jeda waktu", async () => {
    // Hanya pengajuan Menunggu yang dicek; pengajuan Ditolak tidak lagi menghalangi.
    const res = await POST(buatPost(payload));

    expect(res.status).toBe(201);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(mockFindFirst.mock.calls[0][0].where.status).toBe("Menunggu");
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.user_id).toBe("user-1");
    expect(data.status).toBe("Menunggu");
    expect(mockAudit.mock.calls[0][0].action).toBe("ajukan-mitra-smk");
  });

  it("menolak jika NPSN sudah terdaftar sebagai mitra SMK", async () => {
    mockSmkFind.mockResolvedValue({ smk_id: "smk-1" });
    const res = await POST(buatPost(payload));
    expect(res.status).toBe(409);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("GET /api/pengajuan-mitra - status pengajuan milik sendiri", () => {
  it("mengembalikan hanya pengajuan milik akun yang login beserta catatan penolakan", async () => {
    mockFindMany.mockResolvedValue([
      { pengajuan_id: "p-1", status: "Ditolak", catatanAdmin: "NPSN tidak sesuai" },
    ]);

    const res = await GET(new NextRequest("http://localhost:3000/api/pengajuan-mitra"));
    const json = await res.json();

    expect(mockFindMany.mock.calls[0][0].where).toEqual({ user_id: "user-1" });
    expect(json.data[0].catatanAdmin).toBe("NPSN tidak sesuai");
  });

  it("menolak jika belum login", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost:3000/api/pengajuan-mitra"));
    expect(res.status).toBe(401);
  });
});
