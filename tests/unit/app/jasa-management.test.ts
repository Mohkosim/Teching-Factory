import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jurusan: { findUnique: vi.fn() },
    jasa: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    produk: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    fotoProduk: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

const { GET, POST } = await import("@/app/api/jasa/route");
const { GET: GET_BY_ID, PATCH, DELETE } = await import("@/app/api/jasa/[id]/route");
const { prisma } = await import("@/lib/prisma");
const { getServerSession } = await import("next-auth");

const mockedGetServerSession = vi.mocked(getServerSession);
const jurusanFindUnique = prisma.jurusan.findUnique as unknown as ReturnType<typeof vi.fn>;
const jasaFindMany = prisma.jasa.findMany as unknown as ReturnType<typeof vi.fn>;
const jasaFindUnique = prisma.jasa.findUnique as unknown as ReturnType<typeof vi.fn>;
const jasaUpdate = prisma.jasa.update as unknown as ReturnType<typeof vi.fn>;
const jasaDelete = prisma.jasa.delete as unknown as ReturnType<typeof vi.fn>;
const produkCreate = prisma.produk.create as unknown as ReturnType<typeof vi.fn>;
const produkUpdate = prisma.produk.update as unknown as ReturnType<typeof vi.fn>;
const produkDelete = prisma.produk.delete as unknown as ReturnType<typeof vi.fn>;
const fotoDeleteMany = prisma.fotoProduk.deleteMany as unknown as ReturnType<typeof vi.fn>;

function sesiAdminJurusan(userId = "user-jurusan-1"): Session {
  return { user: { id: userId, role: "AdminJurusan" } } as unknown as Session;
}
function sesiAdminSMK(userId = "user-smk-1"): Session {
  return { user: { id: userId, role: "AdminSMK" } } as unknown as Session;
}

type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function buatRequest(body: unknown, method = "POST") {
  const init: NextRequestInit = { method };
  if (method !== "GET" && method !== "DELETE") {
    init.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost:3000/api/jasa", init);
}

const jasaPayloadValid = {
  nama_jasa: "Servis AC Rumah",
  deskripsi: "Servis AC oleh siswa jurusan Teknik Elektro",
  harga: 150000,
  status: "Tersedia" as const,
  estimasi_pengerjaan: "1-2 hari",
  total_project: 5,
  fotos: ["https://res.cloudinary.com/foto-jasa1.jpg"],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/jasa — hanya milik jurusan sendiri", () => {
  it("menolak role selain AdminJurusan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK());
    const res = await GET();
    expect(res.status).toBe(401);
    expect(jasaFindMany).not.toHaveBeenCalled();
  });

  it("mengambil jasa dengan filter jurusan_id milik AdminJurusan yang login, bukan jurusan lain", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-1"));
    jurusanFindUnique.mockResolvedValue({ jurusan_id: "jurusan-A" });
    jasaFindMany.mockResolvedValue([]);

    await GET();

    expect(jasaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { produk: { jurusan_id: "jurusan-A" } } })
    );
  });
});

describe("POST /api/jasa — membuat jasa baru", () => {
  it("menolak payload yang tidak lolos validasi Zod", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan());
    const res = await POST(buatRequest({ ...jasaPayloadValid, nama_jasa: "" }));
    expect(res.status).toBe(400);
    expect(produkCreate).not.toHaveBeenCalled();
  });

  it("jasa baru dibuat dengan jurusan_id milik admin yang login", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-1"));
    jurusanFindUnique.mockResolvedValue({ jurusan_id: "jurusan-A" });
    produkCreate.mockResolvedValue({ produk_id: "produk-1" });

    const res = await POST(buatRequest(jasaPayloadValid));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Jasa berhasil ditambahkan");
    expect(produkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jurusan_id: "jurusan-A" }),
      })
    );
  });

  it("gagal (404) jika admin jurusan belum punya data Jurusan yang valid", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan());
    jurusanFindUnique.mockResolvedValue(null);

    const res = await POST(buatRequest(jasaPayloadValid));
    expect(res.status).toBe(404);
    expect(produkCreate).not.toHaveBeenCalled();
  });
});

describe("GET/PATCH/DELETE /api/jasa/[id] — kepemilikan lintas tenant", () => {
  const params = Promise.resolve({ id: "jasa-1" });

  it("AdminJurusan A TIDAK BISA melihat jasa milik AdminJurusan B", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk: { jurusan: { user_id: "user-jurusan-B" } },
    });

    const res = await GET_BY_ID(buatRequest({}, "GET"), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Jasa tidak ditemukan");
  });

  it("AdminJurusan A TIDAK BISA mengedit jasa milik AdminJurusan B", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk: { jurusan: { user_id: "user-jurusan-B" } },
    });

    const res = await PATCH(buatRequest(jasaPayloadValid, "PATCH"), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Jasa tidak ditemukan");
    expect(jasaUpdate).not.toHaveBeenCalled();
  });

  it("AdminJurusan A TIDAK BISA menghapus jasa milik AdminJurusan B", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk: { jurusan: { user_id: "user-jurusan-B" } },
    });

    const res = await DELETE(buatRequest({}, "DELETE"), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Jasa tidak ditemukan");
    expect(jasaDelete).not.toHaveBeenCalled();
  });

  it("pemilik sah BISA mengedit jasanya sendiri (produk & jasa ikut ter-update)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk_id: "produk-1",
      produk: { jurusan: { user_id: "user-jurusan-A" }, status_publikasi: "Published" },
    });
    jasaUpdate.mockResolvedValue({ jasa_id: "jasa-1" });

    const res = await PATCH(buatRequest(jasaPayloadValid, "PATCH"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Jasa berhasil diperbarui");
    expect(produkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { produk_id: "produk-1" } })
    );
    expect(jasaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jasa_id: "jasa-1" },
        data: expect.objectContaining({
          nama_jasa: jasaPayloadValid.nama_jasa,
          total_project: jasaPayloadValid.total_project,
        }),
      })
    );
  });

  it("mengedit jasa berstatus 'Revisi' otomatis mengembalikan status_publikasi ke 'Pending'", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk_id: "produk-1",
      produk: { jurusan: { user_id: "user-jurusan-A" }, status_publikasi: "Revisi" },
    });
    jasaUpdate.mockResolvedValue({ jasa_id: "jasa-1" });

    await PATCH(buatRequest(jasaPayloadValid, "PATCH"), { params });

    expect(produkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status_publikasi: "Pending" }),
      })
    );
  });

  it("pemilik sah BISA menghapus jasanya sendiri, beserta relasi foto & produk induk", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk_id: "produk-1",
      produk: { jurusan: { user_id: "user-jurusan-A" } },
    });

    const res = await DELETE(buatRequest({}, "DELETE"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Jasa berhasil dihapus");
    expect(fotoDeleteMany).toHaveBeenCalledWith({ where: { produk_id: "produk-1" } });
    expect(jasaDelete).toHaveBeenCalledWith({ where: { jasa_id: "jasa-1" } });
    expect(produkDelete).toHaveBeenCalledWith({ where: { produk_id: "produk-1" } });
  });
});

describe("PATCH /api/jasa/[id] — alur revisi & publikasi oleh AdminSMK", () => {
  const params = Promise.resolve({ id: "jasa-1" });

  it("AdminSMK dari SMK lain TIDAK BISA mempublikasikan jasa SMK lain", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk_id: "produk-1",
      produk: { jurusan: { smk: { user_id: "user-smk-B" } } },
    });

    const res = await PATCH(buatRequest({ action: "publikasi" }, "PATCH"), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Jasa tidak ditemukan");
    expect(produkUpdate).not.toHaveBeenCalled();
  });

  it("AdminSMK pemilik BISA mempublikasikan jasa jurusannya sendiri", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk_id: "produk-1",
      produk: { jurusan: { smk: { user_id: "user-smk-A" } } },
    });
    produkUpdate.mockResolvedValue({ produk_id: "produk-1", status_publikasi: "Published" });

    const res = await PATCH(buatRequest({ action: "publikasi" }, "PATCH"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Jasa berhasil dipublikasikan");
    expect(produkUpdate).toHaveBeenCalledWith({
      where: { produk_id: "produk-1" },
      data: { status_publikasi: "Published", catatan_revisi: null },
    });
  });

  it("AdminSMK mengirim revisi tanpa catatan_revisi -> ditolak (400)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk_id: "produk-1",
      produk: { jurusan: { smk: { user_id: "user-smk-A" } } },
    });

    const res = await PATCH(buatRequest({ action: "revisi" }, "PATCH"), { params });
    expect(res.status).toBe(400);
    expect(produkUpdate).not.toHaveBeenCalled();
  });

  it("AdminSMK mengirim revisi dengan catatan -> status_publikasi produk induk jadi 'Revisi'", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-A"));
    jasaFindUnique.mockResolvedValue({
      jasa_id: "jasa-1",
      produk_id: "produk-1",
      produk: { jurusan: { smk: { user_id: "user-smk-A" } } },
    });
    produkUpdate.mockResolvedValue({ produk_id: "produk-1", status_publikasi: "Revisi" });

    const res = await PATCH(
      buatRequest({ action: "revisi", catatan_revisi: "Deskripsi kurang lengkap" }, "PATCH"),
      { params }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Catatan revisi berhasil dikirim");
    expect(produkUpdate).toHaveBeenCalledWith({
      where: { produk_id: "produk-1" },
      data: { status_publikasi: "Revisi", catatan_revisi: "Deskripsi kurang lengkap" },
    });
  });
});