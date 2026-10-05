// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/prisma", () => {
  const tx = {
    pengajuanMitraSMK: { update: vi.fn() },
    user: { update: vi.fn() },
    sMK: { upsert: vi.fn() },
  };
  return {
    prisma: {
      pengajuanMitraSMK: { findUnique: vi.fn(), update: vi.fn() },
      user: { findUnique: vi.fn() },
      sMK: { findFirst: vi.fn() },
      $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
      __tx: tx,
    },
  };
});

vi.mock("@/lib/mail", () => ({ sendPengajuanMitraDitolakEmail: vi.fn() }));
vi.mock("@/lib/utils/audit-log", () => ({ recordAuditLog: vi.fn() }));

const { PATCH } = await import("@/app/api/pengajuan-mitra/[id]/route");
const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { sendPengajuanMitraDitolakEmail } = await import("@/lib/mail");
const { recordAuditLog } = await import("@/lib/utils/audit-log");

const m = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const mockSession = m(getServerSession);
const mockPengajuanFind = m(prisma.pengajuanMitraSMK.findUnique);
const mockPengajuanUpdate = m(prisma.pengajuanMitraSMK.update);
const mockUserFind = m(prisma.user.findUnique);
const mockSmkFindFirst = m(prisma.sMK.findFirst);
const mockEmail = m(sendPengajuanMitraDitolakEmail);
const mockAudit = m(recordAuditLog);
const tx = (prisma as unknown as { __tx: Record<string, Record<string, ReturnType<typeof vi.fn>>> }).__tx;

const ID = "pengajuan-1";
const ctx = { params: Promise.resolve({ id: ID }) };

const pengajuan = {
  pengajuan_id: ID,
  user_id: "user-1",
  namaSekolah: "SMK Negeri 3 Pamekasan",
  npsn: "20522637",
  namaPenanggungJawab: "Pak Budi",
  noHpPenanggungJawab: "081906906536",
  status: "Menunggu",
};

function buatRequest(body: unknown) {
  return new NextRequest(`http://localhost:3000/api/pengajuan-mitra/${ID}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  for (const fn of [
    mockSession, mockPengajuanFind, mockPengajuanUpdate, mockUserFind,
    mockSmkFindFirst, mockEmail, mockAudit,
    tx.pengajuanMitraSMK.update, tx.user.update, tx.sMK.upsert,
  ]) {
    fn.mockReset();
  }
  mockSession.mockResolvedValue({
    user: { id: "sa-1", role: "SuperAdmin", name: "Super Admin", email: "sa@gmail.com" },
  });
  mockPengajuanFind.mockResolvedValue(pengajuan);
  mockPengajuanUpdate.mockImplementation(async ({ data }: { data: object }) => ({ ...pengajuan, ...data }));
  mockUserFind.mockResolvedValue({ email: "smk@gmail.com" });
  mockEmail.mockResolvedValue(undefined);
  mockAudit.mockResolvedValue(undefined);
});

describe("PATCH /api/pengajuan-mitra/[id] - penolakan", () => {
  it("menolak akses jika bukan SuperAdmin", async () => {
    mockSession.mockResolvedValue({ user: { id: "u-2", role: "User" } });
    const res = await PATCH(buatRequest({ action: "reject", catatanAdmin: "tes" }), ctx);
    expect(res.status).toBe(401);
    expect(mockPengajuanUpdate).not.toHaveBeenCalled();
  });

  it("menolak pengajuan: status Ditolak, catatan tersimpan, role akun tidak diubah", async () => {
    const res = await PATCH(buatRequest({ action: "reject", catatanAdmin: "NPSN tidak sesuai" }), ctx);

    expect(res.status).toBe(200);
    const arg = mockPengajuanUpdate.mock.calls[0][0];
    expect(arg.data.status).toBe("Ditolak");
    expect(arg.data.catatanAdmin).toBe("NPSN tidak sesuai");
    expect(arg.data.diprosesOlehId).toBe("sa-1");
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(mockAudit.mock.calls[0][0].action).toBe("reject-mitra-smk");
  });

  it("mengirim e-mail alasan penolakan beserta tautan perbaikan ke e-mail pemohon", async () => {
    const res = await PATCH(buatRequest({ action: "reject", catatanAdmin: "NPSN tidak sesuai" }), ctx);
    const json = await res.json();

    expect(mockEmail).toHaveBeenCalledWith(
      "smk@gmail.com",
      "SMK Negeri 3 Pamekasan",
      "NPSN tidak sesuai",
      "http://localhost:3000/profile/pengajuan-mitra"
    );
    expect(json.message).toContain("e-mail");
  });

  it("penolakan tetap tersimpan walau e-mail gagal terkirim", async () => {
    mockEmail.mockRejectedValue(new Error("SMTP down"));
    const res = await PATCH(buatRequest({ action: "reject", catatanAdmin: "tes" }), ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockPengajuanUpdate).toHaveBeenCalledTimes(1);
    expect(json.message).toContain("gagal terkirim");
  });

  it("menolak pemrosesan ulang pengajuan yang sudah diproses", async () => {
    mockPengajuanFind.mockResolvedValue({ ...pengajuan, status: "Ditolak" });
    const res = await PATCH(buatRequest({ action: "reject", catatanAdmin: "tes" }), ctx);

    expect(res.status).toBe(400);
    expect(mockPengajuanUpdate).not.toHaveBeenCalled();
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 jika pengajuan tidak ditemukan", async () => {
    mockPengajuanFind.mockResolvedValue(null);
    const res = await PATCH(buatRequest({ action: "reject" }), ctx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/pengajuan-mitra/[id] - persetujuan", () => {
  it("menyetujui pengajuan: role menjadi AdminSMK dan tidak mengirim e-mail penolakan", async () => {
    mockSmkFindFirst.mockResolvedValue(null);
    tx.pengajuanMitraSMK.update.mockResolvedValue({ ...pengajuan, status: "Disetujui" });

    const res = await PATCH(buatRequest({ action: "approve" }), ctx);

    expect(res.status).toBe(200);
    expect(tx.user.update.mock.calls[0][0].data.role).toBe("AdminSMK");
    expect(mockEmail).not.toHaveBeenCalled();
  });
});
