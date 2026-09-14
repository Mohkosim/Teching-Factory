import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import type { CheckoutPayload } from "@/types/interfaces/checkout";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    alamat: { findUnique: vi.fn() },
    $transaction: vi.fn(),
    order_Detail: { findMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/midtrans", () => ({
  snap: { createTransaction: vi.fn() },
}));

vi.mock("@/lib/utils/invoice", () => ({
  generateKodeInvoice: vi.fn(() => "INV-20260908-TESTAA"),
}));

const { POST } = await import("@/app/api/order/checkout/route");
const { prisma } = await import("@/lib/prisma");
const { getServerSession } = await import("next-auth");
const { snap } = await import("@/lib/midtrans");

const mockedGetServerSession = vi.mocked(getServerSession);
const alamatFindUnique = prisma.alamat.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockedCreateTransaction = vi.mocked(snap.createTransaction);

type SnapTransactionResponse = Awaited<ReturnType<typeof snap.createTransaction>>;

function sesiUser(userId = "user-1"): Session {
  return { user: { id: userId, role: "User" } } as unknown as Session;
}

function buatRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/order/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const alamatValid = {
  alamat_id: "alamat-1",
  user_id: "user-1",
  nama_penerima: "Budi",
  nomor_telepon: "0812xxxx",
  alamat_lengkap: "Jl. Mawar",
  kecamatan: "Lumajang",
  kota: "Lumajang",
  provinsi: "Jawa Timur",
  kode_pos: "67351",
};

function payloadDasar(overrides: Partial<CheckoutPayload> = {}): CheckoutPayload {
  return {
    alamatId: "alamat-1",
    toko: [
      {
        jurusanId: "jurusan-A",
        produk: [{ produkId: "produk-1", jumlah: 2, hargaSatuan: 50000 }],
        jasa: { kurir: "JNE", layanan: "REG", ongkir: 15000, estimasi: "2 hari" },
      },
    ],
    ...overrides,
  };
}

/**
 * Membuat mock objek `tx` (Prisma transaction client) yang dipakai di dalam
 * prisma.$transaction(async (tx) => {...}) pada route checkout, lalu
 * membuat prisma.$transaction benar-benar menjalankan callback tersebut
 * (meniru perilaku transaksi Prisma yang sesungguhnya).
 */
function pasangTransaksiSukses(opts: {
  barangStok?: number;
  kombinasiStok?: number;
}) {
  const tx = {
    varianKombinasi: {
      findUnique: vi.fn().mockResolvedValue(
        opts.kombinasiStok !== undefined ? { kombinasi_id: "komb-1", stok: opts.kombinasiStok } : null
      ),
      update: vi.fn().mockResolvedValue({}),
    },
    barang: {
      findFirst: vi.fn().mockResolvedValue(
        opts.barangStok !== undefined ? { barang_id: "barang-1", stok: opts.barangStok } : null
      ),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    produk: {
      update: vi.fn().mockResolvedValue({}),
    },
    order: {
      create: vi.fn().mockResolvedValue({ order_id: "order-1" }),
      delete: vi.fn().mockResolvedValue({}),
    },
    order_Detail: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
  };

  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/order/checkout — otorisasi & validasi input", () => {
  it("menolak (401) jika belum login", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const res = await POST(buatRequest(payloadDasar()));
    expect(res.status).toBe(401);
  });

  it("menolak (400) jika alamatId kosong", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    const res = await POST(buatRequest(payloadDasar({ alamatId: "" })));
    expect(res.status).toBe(400);
  });

  it("menolak (400) jika keranjang/toko kosong", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    const res = await POST(buatRequest(payloadDasar({ toko: [] })));
    expect(res.status).toBe(400);
  });

  it("menolak (400) jika alamat tidak ditemukan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(null);

    const res = await POST(buatRequest(payloadDasar()));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Alamat tidak valid");
  });

  it("menolak (400) jika alamat MILIK USER LAIN (tidak boleh checkout pakai alamat orang lain)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser("user-1"));
    alamatFindUnique.mockResolvedValue({ ...alamatValid, user_id: "user-LAIN" });

    const res = await POST(buatRequest(payloadDasar()));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toBe("Alamat tidak valid");
  });
});

describe("POST /api/order/checkout — validasi stok", () => {
  it("menolak (400) checkout produk non-varian yang stoknya kurang dari jumlah pesanan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    pasangTransaksiSukses({ barangStok: 1 }); // stok 1, dipesan 2

    const res = await POST(buatRequest(payloadDasar()));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/stoknya sudah habis atau kurang/i);
    expect(mockedCreateTransaction).not.toHaveBeenCalled();
  });

  it("menolak (400) checkout produk non-varian yang tidak punya baris Barang sama sekali", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    pasangTransaksiSukses({}); // barangStok undefined -> findFirst() null

    const res = await POST(buatRequest(payloadDasar()));
    expect(res.status).toBe(400);
  });

  it("menolak (400) checkout produk BERVARIAN yang stok kombinasinya kurang dari jumlah pesanan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    pasangTransaksiSukses({ kombinasiStok: 1 });

    const payload = payloadDasar({
      toko: [
        {
          jurusanId: "jurusan-A",
          produk: [{ produkId: "produk-1", jumlah: 2, hargaSatuan: 50000, kombinasiId: "komb-1" }],
          jasa: { kurir: "JNE", layanan: "REG", ongkir: 15000, estimasi: "2 hari" },
        },
      ],
    });

    const res = await POST(buatRequest(payload));
    expect(res.status).toBe(400);
  });

  it("stok cukup (pas sama dengan jumlah pesanan) -> checkout tetap berhasil, bukan ditolak", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    pasangTransaksiSukses({ barangStok: 2 }); // stok pas 2, dipesan 2
    mockedCreateTransaction.mockResolvedValue(
      { token: "snap-token-123" } as unknown as SnapTransactionResponse
    );

    const res = await POST(buatRequest(payloadDasar()));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/order/checkout — pemrosesan transaksi penjualan", () => {
  it("checkout sukses: stok Barang berkurang sesuai jumlah pesanan & sold_count bertambah", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    const tx = pasangTransaksiSukses({ barangStok: 10 });
    mockedCreateTransaction.mockResolvedValue(
      { token: "snap-token-123" } as unknown as SnapTransactionResponse
    );

    await POST(buatRequest(payloadDasar()));

    expect(tx.barang.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { produk_id: "produk-1" },
        data: { stok: { decrement: 2 } },
      })
    );
    expect(tx.produk.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { produk_id: "produk-1" },
        data: { sold_count: { increment: 2 } },
      })
    );
  });

  it("checkout produk BERVARIAN: stok VarianKombinasi DAN stok Barang agregat sama-sama berkurang", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    const tx = pasangTransaksiSukses({ kombinasiStok: 10 });
    mockedCreateTransaction.mockResolvedValue(
      { token: "snap-token-123" } as unknown as SnapTransactionResponse
    );

    const payload = payloadDasar({
      toko: [
        {
          jurusanId: "jurusan-A",
          produk: [{ produkId: "produk-1", jumlah: 3, hargaSatuan: 50000, kombinasiId: "komb-1" }],
          jasa: { kurir: "JNE", layanan: "REG", ongkir: 15000, estimasi: "2 hari" },
        },
      ],
    });

    await POST(buatRequest(payload));

    expect(tx.varianKombinasi.update).toHaveBeenCalledWith({
      where: { kombinasi_id: "komb-1" },
      data: { stok: { decrement: 3 } },
    });
    expect(tx.barang.updateMany).toHaveBeenCalledWith({
      where: { produk_id: "produk-1" },
      data: { stok: { decrement: 3 } },
    });
  });

  it("1 Order dibuat per toko/jurusan, totalnya = subtotal produk + ongkir toko itu sendiri", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    const tx = pasangTransaksiSukses({ barangStok: 10 });
    mockedCreateTransaction.mockResolvedValue(
      { token: "snap-token-123" } as unknown as SnapTransactionResponse
    );

    const payload = payloadDasar({
      toko: [
        {
          jurusanId: "jurusan-A",
          produk: [{ produkId: "produk-1", jumlah: 2, hargaSatuan: 50000 }], // 100.000
          jasa: { kurir: "JNE", layanan: "REG", ongkir: 15000, estimasi: "2 hari" }, // +15.000
        },
        {
          jurusanId: "jurusan-B",
          produk: [{ produkId: "produk-2", jumlah: 1, hargaSatuan: 200000 }], // 200.000
          jasa: { kurir: "JNT", layanan: "EZ", ongkir: 20000, estimasi: "3 hari" }, // +20.000
        },
      ],
    });

    await POST(buatRequest(payload));

    expect(tx.order.create).toHaveBeenCalledTimes(2);
    expect(tx.order.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ total_harga: 115000 }) })
    );
    expect(tx.order.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ total_harga: 220000 }) })
    );
  });

  it("Order baru berstatus 'Menunggu' / 'Menunggu_Konfirmasi', BUKAN langsung Lunas (menunggu konfirmasi Midtrans)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    const tx = pasangTransaksiSukses({ barangStok: 10 });
    mockedCreateTransaction.mockResolvedValue(
      { token: "snap-token-123" } as unknown as SnapTransactionResponse
    );

    await POST(buatRequest(payloadDasar()));

    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status_order: "Menunggu",
          status_pembayaran: "Menunggu_Konfirmasi",
        }),
      })
    );
  });

  it("transaksi Midtrans Snap dibuat dengan gross_amount = total gabungan seluruh toko, dan order_id = kodeInvoice", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    pasangTransaksiSukses({ barangStok: 10 });
    mockedCreateTransaction.mockResolvedValue(
      { token: "snap-token-123" } as unknown as SnapTransactionResponse
    );

    const payload = payloadDasar({
      toko: [
        {
          jurusanId: "jurusan-A",
          produk: [{ produkId: "produk-1", jumlah: 2, hargaSatuan: 50000 }],
          jasa: { kurir: "JNE", layanan: "REG", ongkir: 15000, estimasi: "2 hari" },
        },
      ],
    });

    const res = await POST(buatRequest(payload));
    const json = await res.json();

    expect(mockedCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_details: { order_id: "INV-20260908-TESTAA", gross_amount: 115000 },
      })
    );
    expect(json).toEqual({
      kodeInvoice: "INV-20260908-TESTAA",
      orderIds: ["order-1"],
      snapToken: "snap-token-123",
    });
  });

  it("item keranjang lama (keranjangDetailId) dibersihkan setelah checkout supaya tidak dipesan dua kali", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    const tx = pasangTransaksiSukses({ barangStok: 10 });
    tx.order_Detail.findMany.mockResolvedValue([
      { order_detail_id: "od-lama-1", order_id: "order-keranjang-lama" },
    ]);
    tx.order_Detail.count.mockResolvedValue(0); // keranjang jadi kosong setelah dihapus
    mockedCreateTransaction.mockResolvedValue(
      { token: "snap-token-123" } as unknown as SnapTransactionResponse
    );

    const payload = payloadDasar({
      toko: [
        {
          jurusanId: "jurusan-A",
          produk: [{ produkId: "produk-1", jumlah: 2, hargaSatuan: 50000, keranjangDetailId: "od-lama-1" }],
          jasa: { kurir: "JNE", layanan: "REG", ongkir: 15000, estimasi: "2 hari" },
        },
      ],
    });

    await POST(buatRequest(payload));

    expect(tx.order_Detail.deleteMany).toHaveBeenCalledWith({
      where: { order_detail_id: { in: ["od-lama-1"] } },
    });
    // keranjang lama jadi kosong -> Order keranjang itu ikut dihapus
    expect(tx.order.delete).toHaveBeenCalledWith({ where: { order_id: "order-keranjang-lama" } });
  });

  it("gagal (500) jika terjadi error tak terduga saat transaksi database", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    alamatFindUnique.mockResolvedValue(alamatValid);
    mockTransaction.mockRejectedValue(new Error("DB down"));

    const res = await POST(buatRequest(payloadDasar()));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).toBe("Gagal membuat pesanan");
  });
});