import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jurusan: { findUnique: vi.fn() },
    produk: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    fotoProduk: { deleteMany: vi.fn(), createMany: vi.fn() },
    barang: { update: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

const { GET, POST } = await import("@/app/api/produk/route");
const { GET: GET_BY_ID, PATCH, DELETE } = await import("@/app/api/produk/[id]/route");
const { prisma } = await import("@/lib/prisma");
const { getServerSession } = await import("next-auth");

const mockedGetServerSession = vi.mocked(getServerSession);
const jurusanFindUnique = prisma.jurusan.findUnique as unknown as ReturnType<typeof vi.fn>;
const produkFindMany = prisma.produk.findMany as unknown as ReturnType<typeof vi.fn>;
const produkFindUnique = prisma.produk.findUnique as unknown as ReturnType<typeof vi.fn>;
const produkCreate = prisma.produk.create as unknown as ReturnType<typeof vi.fn>;
const produkUpdate = prisma.produk.update as unknown as ReturnType<typeof vi.fn>;
const produkDelete = prisma.produk.delete as unknown as ReturnType<typeof vi.fn>;
const barangUpdate = prisma.barang.update as unknown as ReturnType<typeof vi.fn>;
const barangCreate = prisma.barang.create as unknown as ReturnType<typeof vi.fn>;
const fotoDeleteMany = prisma.fotoProduk.deleteMany as unknown as ReturnType<typeof vi.fn>;
const barangDeleteMany = prisma.barang.deleteMany as unknown as ReturnType<typeof vi.fn>;

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
  return new NextRequest("http://localhost:3000/api/produk", init);
}

const produkPayloadValid = {
  nama_produk: "Kursi Kayu Jati",
  deskripsi: "Kursi kayu jati buatan siswa",
  harga: 250000,
  status: "Tersedia" as const,
  fotos: ["https://res.cloudinary.com/foto1.jpg"],
  stok: 10,
  kondisi: "Baru",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/produk — hanya milik jurusan sendiri", () => {
  it("menolak role selain AdminJurusan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK());
    const res = await GET();
    expect(res.status).toBe(401);
    expect(produkFindMany).not.toHaveBeenCalled();
  });

  it("mengambil produk dengan filter jurusan_id milik AdminJurusan yang login, bukan jurusan lain", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-1"));
    jurusanFindUnique.mockResolvedValue({ jurusan_id: "jurusan-A" });
    produkFindMany.mockResolvedValue([]);

    await GET();

    expect(produkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jurusan_id: "jurusan-A" } })
    );
  });
});

describe("POST /api/produk — membuat produk baru", () => {
  it("menolak role selain AdminJurusan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK());
    const res = await POST(buatRequest(produkPayloadValid));
    expect(res.status).toBe(401);
    expect(produkCreate).not.toHaveBeenCalled();
  });

  it("menolak payload yang tidak lolos validasi Zod", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan());
    const res = await POST(buatRequest({ ...produkPayloadValid, nama_produk: "" }));
    expect(res.status).toBe(400);
    expect(produkCreate).not.toHaveBeenCalled();
  });

  it("produk baru dibuat dengan jurusan_id milik admin yang login (bukan bisa diset bebas dari body)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-1"));
    jurusanFindUnique.mockResolvedValue({ jurusan_id: "jurusan-A" });
    produkCreate.mockResolvedValue({ produk_id: "produk-1", ...produkPayloadValid });

    const res = await POST(buatRequest(produkPayloadValid));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Produk berhasil ditambahkan");
    expect(produkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jurusan_id: "jurusan-A" }),
      })
    );
  });

  it("gagal (404) jika admin jurusan belum punya data Jurusan yang valid", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan());
    jurusanFindUnique.mockResolvedValue(null);

    const res = await POST(buatRequest(produkPayloadValid));
    expect(res.status).toBe(404);
    expect(produkCreate).not.toHaveBeenCalled();
  });
});

describe("GET/PATCH/DELETE /api/produk/[id] — kepemilikan lintas tenant", () => {
  const params = Promise.resolve({ id: "produk-1" });

  it("AdminJurusan A TIDAK BISA melihat produk milik AdminJurusan B (404, bukan data orang lain)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { user_id: "user-jurusan-B" }, // pemilik asli beda dari yang login
    });

    const res = await GET_BY_ID(buatRequest({}, "GET"), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Produk tidak ditemukan");
  });

  it("AdminJurusan pemilik yang sah BISA melihat produknya sendiri", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { user_id: "user-jurusan-A" },
    });

    const res = await GET_BY_ID(buatRequest({}, "GET"), { params });
    expect(res.status).toBe(200);
  });

  it("AdminJurusan A TIDAK BISA mengedit produk milik AdminJurusan B", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { user_id: "user-jurusan-B" },
      barang: [],
    });

    const res = await PATCH(buatRequest(produkPayloadValid, "PATCH"), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Produk tidak ditemukan");
    expect(produkUpdate).not.toHaveBeenCalled();
  });

  it("AdminJurusan A TIDAK BISA menghapus produk milik AdminJurusan B", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { user_id: "user-jurusan-B" },
    });

    const res = await DELETE(buatRequest({}, "DELETE"), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Produk tidak ditemukan");
    expect(produkDelete).not.toHaveBeenCalled();
  });

  it("pemilik sah BISA mengedit produknya sendiri, dan stok/barang ikut ter-update", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { user_id: "user-jurusan-A" },
      status_publikasi: "Published",
      barang: [{ barang_id: "barang-1" }],
    });
    produkUpdate.mockResolvedValue({ produk_id: "produk-1" });

    const res = await PATCH(buatRequest(produkPayloadValid, "PATCH"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Produk berhasil diperbarui");
    expect(barangUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { barang_id: "barang-1" },
        data: { stok: produkPayloadValid.stok, kondisi: produkPayloadValid.kondisi },
      })
    );
    expect(barangCreate).not.toHaveBeenCalled();
  });

  it("edit produk yang belum punya baris Barang -> baris Barang baru dibuat (bukan update)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { user_id: "user-jurusan-A" },
      status_publikasi: "Published",
      barang: [],
    });
    produkUpdate.mockResolvedValue({ produk_id: "produk-1" });

    await PATCH(buatRequest(produkPayloadValid, "PATCH"), { params });

    expect(barangCreate).toHaveBeenCalledWith({
      data: { produk_id: "produk-1", stok: produkPayloadValid.stok, kondisi: produkPayloadValid.kondisi },
    });
    expect(barangUpdate).not.toHaveBeenCalled();
  });

  it("mengedit produk berstatus 'Revisi' otomatis mengembalikan status_publikasi ke 'Pending'", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { user_id: "user-jurusan-A" },
      status_publikasi: "Revisi",
      barang: [{ barang_id: "barang-1" }],
    });
    produkUpdate.mockResolvedValue({ produk_id: "produk-1" });

    await PATCH(buatRequest(produkPayloadValid, "PATCH"), { params });

    expect(produkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status_publikasi: "Pending" }),
      })
    );
  });

  it("pemilik sah BISA menghapus produknya sendiri, beserta relasi foto & barang", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan("user-jurusan-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { user_id: "user-jurusan-A" },
    });

    const res = await DELETE(buatRequest({}, "DELETE"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Produk berhasil dihapus");
    expect(fotoDeleteMany).toHaveBeenCalledWith({ where: { produk_id: "produk-1" } });
    expect(barangDeleteMany).toHaveBeenCalledWith({ where: { produk_id: "produk-1" } });
    expect(produkDelete).toHaveBeenCalledWith({ where: { produk_id: "produk-1" } });
  });
});

describe("PATCH /api/produk/[id] — alur revisi & publikasi oleh AdminSMK", () => {
  const params = Promise.resolve({ id: "produk-1" });

  it("AdminJurusan TIDAK BISA melakukan aksi 'publikasi' (hanya AdminSMK yang berwenang)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminJurusan());

    const res = await PATCH(buatRequest({ action: "publikasi" }, "PATCH"), { params });
    expect(res.status).toBe(401);
    expect(produkUpdate).not.toHaveBeenCalled();
  });

  it("AdminSMK dari SMK lain TIDAK BISA mempublikasikan produk SMK lain", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { smk: { user_id: "user-smk-B" } },
    });

    const res = await PATCH(buatRequest({ action: "publikasi" }, "PATCH"), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe("Produk tidak ditemukan");
    expect(produkUpdate).not.toHaveBeenCalled();
  });

  it("AdminSMK pemilik BISA mempublikasikan produk jurusannya sendiri, catatan_revisi ikut dibersihkan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { smk: { user_id: "user-smk-A" } },
    });
    produkUpdate.mockResolvedValue({ produk_id: "produk-1", status_publikasi: "Published" });

    const res = await PATCH(buatRequest({ action: "publikasi" }, "PATCH"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Produk berhasil dipublikasikan");
    expect(produkUpdate).toHaveBeenCalledWith({
      where: { produk_id: "produk-1" },
      data: { status_publikasi: "Published", catatan_revisi: null },
    });
  });

  it("AdminSMK mengirim revisi tanpa catatan_revisi -> ditolak (400)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { smk: { user_id: "user-smk-A" } },
    });

    const res = await PATCH(buatRequest({ action: "revisi", catatan_revisi: "" }, "PATCH"), { params });
    expect(res.status).toBe(400);
    expect(produkUpdate).not.toHaveBeenCalled();
  });

  it("AdminSMK mengirim revisi dengan catatan -> status_publikasi jadi 'Revisi' beserta catatannya", async () => {
    mockedGetServerSession.mockResolvedValue(sesiAdminSMK("user-smk-A"));
    produkFindUnique.mockResolvedValue({
      produk_id: "produk-1",
      jurusan: { smk: { user_id: "user-smk-A" } },
    });
    produkUpdate.mockResolvedValue({ produk_id: "produk-1", status_publikasi: "Revisi" });

    const res = await PATCH(
      buatRequest({ action: "revisi", catatan_revisi: "Foto kurang jelas" }, "PATCH"),
      { params }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Catatan revisi berhasil dikirim");
    expect(produkUpdate).toHaveBeenCalledWith({
      where: { produk_id: "produk-1" },
      data: { status_publikasi: "Revisi", catatan_revisi: "Foto kurang jelas" },
    });
  });
});