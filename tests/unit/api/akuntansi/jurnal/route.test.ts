// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jurusan: { findUnique: vi.fn() },
    jurnalManual: { create: vi.fn() },
  },
}));

const { POST } = await import("@/app/api/akuntansi/jurnal/route");
const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { PESAN_GUNAKAN_PENGELUARAN, KODE } = await import("@/lib/akuntansi/coa");

const m = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const mockSession = m(getServerSession);
const mockJurusan = m(prisma.jurusan.findUnique);
const mockCreate = m(prisma.jurnalManual.create);

const USER_ID = "user-jurusan-1";
const JURUSAN_ID = "jurusan-1";

const bodyModalAwal = {
  tipe: "ModalAwal",
  tanggal: "2026-10-01",
  keterangan: "Modal awal jurusan",
  templateId: "modal_awal",
  baris: [
    { kode: KODE.KAS, debit: 5_000_000, kredit: 0 },
    { kode: KODE.MODAL, debit: 0, kredit: 5_000_000 },
  ],
};

function buatRequest(body: unknown, rawBody?: string) {
  return new NextRequest("http://localhost:3000/api/akuntansi/jurnal", {
    method: "POST",
    body: rawBody ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  mockSession.mockReset();
  mockJurusan.mockReset();
  mockCreate.mockReset();
  mockSession.mockResolvedValue({ user: { id: USER_ID, role: "AdminJurusan" } });
  mockJurusan.mockResolvedValue({ jurusan_id: JURUSAN_ID });
  mockCreate.mockResolvedValue({ jurnal_id: "jurnal-baru" });
});

describe("POST /api/akuntansi/jurnal - otorisasi", () => {
  it("401 jika belum login", async () => {
    mockSession.mockResolvedValue(null);

    const res = await POST(buatRequest(bodyModalAwal));

    expect(res.status).toBe(401);
    expect(mockJurusan).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("404 jika akun tidak punya jurusan", async () => {
    mockJurusan.mockResolvedValue(null);

    const res = await POST(buatRequest(bodyModalAwal));

    expect(res.status).toBe(404);
    expect((await res.json()).message).toBe("Jurusan tidak ditemukan");
    expect(mockJurusan).toHaveBeenCalledWith({ where: { user_id: USER_ID } });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/akuntansi/jurnal - validasi", () => {
  it("400 jika body bukan JSON", async () => {
    const res = await POST(buatRequest(null, "ini bukan json"));

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("Data tidak valid");
  });

  it.each([undefined, "Otomatis", "umum", ""])("400 untuk tipe jurnal %j", async (tipe) => {
    const res = await POST(buatRequest({ ...bodyModalAwal, tipe }));

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("Tipe jurnal tidak valid");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "   "])("400 jika keterangan kosong (%j)", async (keterangan) => {
    const res = await POST(buatRequest({ ...bodyModalAwal, keterangan }));

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("Keterangan wajib diisi");
  });

  it.each([undefined, "", "bukan-tanggal", "2026-13-45"])("400 untuk tanggal %j", async (tanggal) => {
    const res = await POST(buatRequest({ ...bodyModalAwal, tanggal }));

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("Tanggal tidak valid");
  });

  it("400 jika template tidak sesuai dengan tipe jurnal", async () => {
    const res = await POST(buatRequest({ ...bodyModalAwal, templateId: "akrual_gaji" }));

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("Template tidak sesuai dengan tipe jurnal");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400 jika templateId tidak dikenal", async () => {
    const res = await POST(buatRequest({ ...bodyModalAwal, templateId: "template_ngawur" }));

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("Template tidak sesuai dengan tipe jurnal");
  });

  it("templateId boleh kosong (jurnal tanpa template)", async () => {
    const res = await POST(buatRequest({ ...bodyModalAwal, templateId: undefined }));

    expect(res.status).toBe(200);
    expect(mockCreate.mock.calls[0][0].data.template_id).toBeNull();
  });

  it("400 jika jurnal tidak seimbang, pesan menyebut total debit & kredit", async () => {
    const res = await POST(
      buatRequest({
        ...bodyModalAwal,
        baris: [
          { kode: KODE.KAS, debit: 5_000_000, kredit: 0 },
          { kode: KODE.MODAL, debit: 0, kredit: 4_000_000 },
        ],
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain("Jurnal tidak seimbang");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["kurang dari 2 baris", [{ kode: KODE.KAS, debit: 100, kredit: 0 }], "minimal memiliki 2 baris"],
    ["akun tidak dikenal", [{ kode: "9999", debit: 100, kredit: 0 }, { kode: KODE.MODAL, debit: 0, kredit: 100 }], "Akun 9999 tidak dikenal"],
    ["nominal desimal", [{ kode: KODE.KAS, debit: 100.5, kredit: 0 }, { kode: KODE.MODAL, debit: 0, kredit: 100.5 }], "bilangan bulat tidak negatif"],
    ["nominal negatif", [{ kode: KODE.KAS, debit: -100, kredit: 0 }, { kode: KODE.MODAL, debit: 0, kredit: -100 }], "bilangan bulat tidak negatif"],
    ["debit & kredit sekaligus", [{ kode: KODE.KAS, debit: 100, kredit: 100 }, { kode: KODE.MODAL, debit: 0, kredit: 0 }], "tidak boleh berisi debit dan kredit sekaligus"],
  ])("400 untuk baris: %s", async (_label, baris, potongPesan) => {
    const res = await POST(buatRequest({ ...bodyModalAwal, baris }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toContain(potongPesan);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400 jika baris bukan array", async () => {
    const res = await POST(buatRequest({ ...bodyModalAwal, baris: "abc" }));

    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/akuntansi/jurnal - cegah pengeluaran ganda", () => {
  const barisBebanBayarKas = [
    { kode: KODE.BEBAN_OPERASIONAL, debit: 200_000, kredit: 0 },
    { kode: KODE.KAS, debit: 0, kredit: 200_000 },
  ];

  it("jurnal Umum berupa beban dibayar dari Kas ditolak dengan arahan memakai tombol Pengeluaran", async () => {
    const res = await POST(buatRequest({ tipe: "Umum", tanggal: "2026-10-01", keterangan: "Bayar listrik", baris: barisBebanBayarKas }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe(PESAN_GUNAKAN_PENGELUARAN);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("pembelian bahan baku (HPP) dari Kas juga ditolak untuk jurnal Umum", async () => {
    const res = await POST(
      buatRequest({
        tipe: "Umum",
        tanggal: "2026-10-01",
        keterangan: "Beli bahan",
        baris: [
          { kode: KODE.PEMBELIAN, debit: 300_000, kredit: 0 },
          { kode: KODE.SALDO_PLATFORM, debit: 0, kredit: 300_000 },
        ],
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe(PESAN_GUNAKAN_PENGELUARAN);
  });

  it("pola yang sama pada tipe Penyesuaian tidak diblokir (aturan hanya untuk Umum)", async () => {
    const res = await POST(buatRequest({ tipe: "Penyesuaian", tanggal: "2026-10-01", keterangan: "Koreksi", baris: barisBebanBayarKas }));

    expect(res.status).toBe(200);
  });

  it.each([
    ["prive", [{ kode: KODE.PRIVE, debit: 100_000, kredit: 0 }, { kode: KODE.KAS, debit: 0, kredit: 100_000 }]],
    ["bayar ongkir", [{ kode: KODE.UTANG_ONGKIR, debit: 100_000, kredit: 0 }, { kode: KODE.KAS, debit: 0, kredit: 100_000 }]],
    ["bayar beban di muka", [{ kode: KODE.BEBAN_DIMUKA, debit: 100_000, kredit: 0 }, { kode: KODE.KAS, debit: 0, kredit: 100_000 }]],
    ["lunasi akrual", [{ kode: KODE.UTANG_AKRUAL, debit: 100_000, kredit: 0 }, { kode: KODE.KAS, debit: 0, kredit: 100_000 }]],
  ])("jurnal Umum '%s' tetap boleh", async (_label, baris) => {
    const res = await POST(buatRequest({ tipe: "Umum", tanggal: "2026-10-01", keterangan: "Transaksi umum", baris }));

    expect(res.status).toBe(200);
  });
});

describe("POST /api/akuntansi/jurnal - berhasil", () => {
  it("200 dan mengembalikan jurnal_id", async () => {
    const res = await POST(buatRequest(bodyModalAwal));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ message: "Jurnal berhasil diposting", data: { jurnal_id: "jurnal-baru" } });
  });

  it("menyimpan jurnal dengan jurusan, user, tipe, template, dan keterangan yang benar", async () => {
    await POST(buatRequest({ ...bodyModalAwal, keterangan: "  Modal awal jurusan  " }));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const { data } = mockCreate.mock.calls[0][0];
    expect(data).toMatchObject({
      jurusan_id: JURUSAN_ID,
      user_id: USER_ID,
      tipe: "ModalAwal",
      template_id: "modal_awal",
      keterangan: "Modal awal jurusan",
    });
  });

  it("tanggal disimpan pukul 05:00 UTC (12:00 WIB) agar tidak bergeser hari di zona waktu mana pun", async () => {
    await POST(buatRequest({ ...bodyModalAwal, tanggal: "2026-10-01" }));

    const { tanggal } = mockCreate.mock.calls[0][0].data;
    expect(tanggal.toISOString()).toBe("2026-10-01T05:00:00.000Z");
  });

  it("baris disimpan bersih (hanya kode, debit, kredit) dan baris bernilai 0 dibuang", async () => {
    await POST(
      buatRequest({
        ...bodyModalAwal,
        baris: [
          { kode: KODE.KAS, debit: 5_000_000, kredit: 0, catatan: "diabaikan" },
          { kode: KODE.PIUTANG, debit: 0, kredit: 0 },
          { kode: KODE.MODAL, debit: 0, kredit: 5_000_000 },
        ],
      })
    );

    expect(mockCreate.mock.calls[0][0].data.baris).toEqual([
      { kode: KODE.KAS, debit: 5_000_000, kredit: 0 },
      { kode: KODE.MODAL, debit: 0, kredit: 5_000_000 },
    ]);
  });

  it("nominal string numerik diterima dan dikonversi ke angka", async () => {
    await POST(
      buatRequest({
        ...bodyModalAwal,
        baris: [
          { kode: KODE.KAS, debit: "1000", kredit: 0 },
          { kode: KODE.MODAL, debit: 0, kredit: "1000" },
        ],
      })
    );

    expect(mockCreate.mock.calls[0][0].data.baris).toEqual([
      { kode: KODE.KAS, debit: 1000, kredit: 0 },
      { kode: KODE.MODAL, debit: 0, kredit: 1000 },
    ]);
  });

  it.each([
    ["modal_awal", "ModalAwal", KODE.KAS, KODE.MODAL],
    ["akrual_gaji", "Penyesuaian", KODE.BEBAN_GAJI, KODE.UTANG_AKRUAL],
    ["prive", "Umum", KODE.PRIVE, KODE.KAS],
  ])("template %s untuk tipe %s dapat diposting", async (templateId, tipe, debit, kredit) => {
    const res = await POST(
      buatRequest({
        tipe,
        templateId,
        tanggal: "2026-10-01",
        keterangan: "Via template",
        baris: [
          { kode: debit, debit: 750_000, kredit: 0 },
          { kode: kredit, debit: 0, kredit: 750_000 },
        ],
      })
    );

    expect(res.status).toBe(200);
    expect(mockCreate.mock.calls[0][0].data.template_id).toBe(templateId);
  });
});

describe("POST /api/akuntansi/jurnal - error database", () => {
  it("jurnal yang tidak lolos validasi tidak pernah menyentuh jurnalManual.create", async () => {
    await POST(buatRequest({ ...bodyModalAwal, baris: [] }));

    expect(mockCreate).not.toHaveBeenCalled();
  });
});
