import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

const { POST } = await import("@/app/api/order/checkout/batal/route");
const { prisma } = await import("@/lib/prisma");
const { getServerSession } = await import("next-auth");

const mockedGetServerSession = vi.mocked(getServerSession);
const orderFindMany = prisma.order.findMany as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

function sesiUser(userId = "user-1"): Session {
  return { user: { id: userId, role: "User" } } as unknown as Session;
}

function buatRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/order/checkout/batal", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function orderBelumBayar(overrides: Record<string, unknown> = {}) {
  return {
    order_id: "order-1",
    user_id: "user-1",
    status_pembayaran: "Menunggu_Konfirmasi",
    orderDetail: [
      {
        order_detail_id: "od-1",
        produk_id: "produk-1",
        jumlah: 2,
        harga_satuan: 50000,
        subtotal: 100000,
        kombinasi_id: null,
      },
    ],
    pengiriman: { order_id: "order-1" },
    ...overrides,
  };
}

/**
 * Meniru prisma.$transaction(async (tx) => {...}) di route batal-checkout:
 * membuat mock `tx` lalu benar-benar menjalankan callback dengan tx tsb.
 */
function pasangTransaksi(opts: { cartOrderSudahAda?: boolean } = {}) {
  const tx = {
    order: {
      findFirst: vi.fn().mockResolvedValue(
        opts.cartOrderSudahAda ? { order_id: "cart-lama", user_id: "user-1" } : null
      ),
      create: vi.fn().mockResolvedValue({ order_id: "cart-baru" }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    barang: {
      updateMany: vi.fn().mockResolvedValue({}),
    },
    varianKombinasi: {
      update: vi.fn().mockResolvedValue({}),
    },
    produk: {
      update: vi.fn().mockResolvedValue({}),
    },
    order_Detail: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([{ subtotal: 100000 }]),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
    pengiriman: {
      delete: vi.fn().mockResolvedValue({}),
    },
  };

  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/order/checkout/batal — otorisasi & validasi input", () => {
  it("menolak (401) jika belum login", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const res = await POST(buatRequest({ kodeInvoice: "INV-1" }));
    expect(res.status).toBe(401);
  });

  it("menolak (400) jika kodeInvoice tidak dikirim", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    const res = await POST(buatRequest({}));
    expect(res.status).toBe(400);
  });

  it("menolak (404) jika pesanan dengan kodeInvoice itu tidak ditemukan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([]);

    const res = await POST(buatRequest({ kodeInvoice: "INV-TIDAK-ADA" }));
    expect(res.status).toBe(404);
  });

  it("menolak (404) jika pesanan itu MILIK USER LAIN (tidak boleh batalkan pesanan orang lain)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser("user-1"));
    orderFindMany.mockResolvedValue([orderBelumBayar({ user_id: "user-LAIN" })]);

    const res = await POST(buatRequest({ kodeInvoice: "INV-1" }));
    expect(res.status).toBe(404);
  });

  it("menolak (400) jika pesanan sudah Lunas -> tidak boleh dibatalkan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar({ status_pembayaran: "Lunas" })]);

    const res = await POST(buatRequest({ kodeInvoice: "INV-1" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/sudah dibayar/i);
  });
});

describe("POST /api/order/checkout/batal — rollback stok", () => {
  it("membatalkan pesanan produk non-varian -> stok Barang DIKEMBALIKAN (increment) sesuai jumlah", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar()]);
    const tx = pasangTransaksi();

    await POST(buatRequest({ kodeInvoice: "INV-1" }));

    expect(tx.barang.updateMany).toHaveBeenCalledWith({
      where: { produk_id: "produk-1" },
      data: { stok: { increment: 2 } },
    });
  });

  it("membatalkan pesanan produk BERVARIAN -> stok VarianKombinasi DIKEMBALIKAN (increment)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([
      orderBelumBayar({
        orderDetail: [
          {
            order_detail_id: "od-1",
            produk_id: "produk-1",
            jumlah: 3,
            harga_satuan: 50000,
            subtotal: 150000,
            kombinasi_id: "komb-1",
          },
        ],
      }),
    ]);
    const tx = pasangTransaksi();

    await POST(buatRequest({ kodeInvoice: "INV-1" }));

    expect(tx.varianKombinasi.update).toHaveBeenCalledWith({
      where: { kombinasi_id: "komb-1" },
      data: { stok: { increment: 3 } },
    });
  });

  it("sold_count produk ikut DIKURANGI (decrement) sesuai jumlah yang dibatalkan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar()]);
    const tx = pasangTransaksi();

    await POST(buatRequest({ kodeInvoice: "INV-1" }));

    expect(tx.produk.update).toHaveBeenCalledWith({
      where: { produk_id: "produk-1" },
      data: { sold_count: { decrement: 2 } },
    });
  });

  it("pesanan yang dibatalkan (beserta detail & pengirimannya) dihapus dari database", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar()]);
    const tx = pasangTransaksi();

    await POST(buatRequest({ kodeInvoice: "INV-1" }));

    expect(tx.pengiriman.delete).toHaveBeenCalledWith({ where: { order_id: "order-1" } });
    expect(tx.order_Detail.deleteMany).toHaveBeenCalledWith({ where: { order_id: "order-1" } });
    expect(tx.order.delete).toHaveBeenCalledWith({ where: { order_id: "order-1" } });
  });

  it("item yang dibatalkan dikembalikan ke keranjang BARU jika user belum punya keranjang aktif", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar()]);
    const tx = pasangTransaksi({ cartOrderSudahAda: false });

    await POST(buatRequest({ kodeInvoice: "INV-1" }));

    expect(tx.order.create).toHaveBeenCalledWith({
      data: { user_id: "user-1", total_harga: 0 },
    });
    expect(tx.order_Detail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order_id: "cart-baru", produk_id: "produk-1", jumlah: 2 }),
      })
    );
  });

  it("item yang dibatalkan digabung ke keranjang yang SUDAH ADA (bukan bikin keranjang baru lagi)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar()]);
    const tx = pasangTransaksi({ cartOrderSudahAda: true });

    await POST(buatRequest({ kodeInvoice: "INV-1" }));

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.order_Detail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order_id: "cart-lama" }),
      })
    );
  });

  it("jika produk yang sama sudah ada di keranjang, jumlahnya DIGABUNG (bukan duplikat baris)", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar()]);
    const tx = pasangTransaksi({ cartOrderSudahAda: true });
    tx.order_Detail.findFirst.mockResolvedValue({
      order_detail_id: "od-existing",
      jumlah: 5,
      harga_satuan: 50000,
    });

    await POST(buatRequest({ kodeInvoice: "INV-1" }));

    expect(tx.order_Detail.update).toHaveBeenCalledWith({
      where: { order_detail_id: "od-existing" },
      data: { jumlah: 7, subtotal: 7 * 50000 }, // 5 (sudah ada) + 2 (dibatalkan)
    });
    expect(tx.order_Detail.create).not.toHaveBeenCalled();
  });

  it("total_harga keranjang dihitung ulang dari seluruh detail setelah item dikembalikan", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar()]);
    const tx = pasangTransaksi({ cartOrderSudahAda: true });
    tx.order_Detail.findMany.mockResolvedValue([{ subtotal: 100000 }, { subtotal: 50000 }]);

    await POST(buatRequest({ kodeInvoice: "INV-1" }));

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { order_id: "cart-lama" },
      data: { total_harga: 150000 },
    });
  });

  it("gagal (500) jika terjadi error tak terduga saat rollback", async () => {
    mockedGetServerSession.mockResolvedValue(sesiUser());
    orderFindMany.mockResolvedValue([orderBelumBayar()]);
    mockTransaction.mockRejectedValue(new Error("DB down"));

    const res = await POST(buatRequest({ kodeInvoice: "INV-1" }));
    expect(res.status).toBe(500);
  });
});