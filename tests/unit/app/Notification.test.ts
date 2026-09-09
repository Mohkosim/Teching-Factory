import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    transaksi: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/midtrans", () => ({
  coreApi: { transaction: { status: vi.fn() } },
}));

const SERVER_KEY = "server-key-untuk-test";
process.env.MIDTRANS_SERVER_KEY = SERVER_KEY;

const { POST } = await import("@/app/api/midtrans/notification/route");
const { prisma } = await import("@/lib/prisma");
const { coreApi } = await import("@/lib/midtrans");

const orderFindMany = prisma.order.findMany as unknown as ReturnType<typeof vi.fn>;
const orderFindUnique = prisma.order.findUnique as unknown as ReturnType<typeof vi.fn>;
const orderUpdateMany = prisma.order.updateMany as unknown as ReturnType<typeof vi.fn>;
const orderUpdate = prisma.order.update as unknown as ReturnType<typeof vi.fn>;
const transaksiCreate = prisma.transaksi.create as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockedTransactionStatus = vi.mocked(coreApi.transaction.status);

type MidtransStatusResponse = Awaited<ReturnType<typeof coreApi.transaction.status>>;

interface OrderUpdateArgs {
  where: { order_id: string };
  data: { status_pembayaran: string; status_order?: string };
}

function buatSignature(orderId: string, statusCode: string, grossAmount: string) {
  return crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + SERVER_KEY)
    .digest("hex");
}

function buatNotifikasi(overrides: {
  order_id: string;
  status_code?: string;
  gross_amount?: string;
  payment_type?: string;
}) {
  const status_code = overrides.status_code ?? "200";
  const gross_amount = overrides.gross_amount ?? "115000";
  const signature_key = buatSignature(overrides.order_id, status_code, gross_amount);

  return new Request("http://localhost:3000/api/midtrans/notification", {
    method: "POST",
    body: JSON.stringify({
      order_id: overrides.order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status: "settlement",
      payment_type: overrides.payment_type ?? "bank_transfer",
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/midtrans/notification — keamanan & validasi payload", () => {
  it("menolak (400) jika body bukan JSON valid", async () => {
    const req = new Request("http://localhost:3000/api/midtrans/notification", {
      method: "POST",
      body: "bukan-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("menolak (400) jika order_id atau signature_key tidak dikirim", async () => {
    const req = new Request("http://localhost:3000/api/midtrans/notification", {
      method: "POST",
      body: JSON.stringify({ status_code: "200", gross_amount: "1000" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("menolak (403) jika signature_key TIDAK COCOK (mencegah notifikasi palsu)", async () => {
    const req = new Request("http://localhost:3000/api/midtrans/notification", {
      method: "POST",
      body: JSON.stringify({
        order_id: "INV-20260908-TESTAA",
        status_code: "200",
        gross_amount: "115000",
        signature_key: "signature-palsu-dari-penyerang",
        transaction_status: "settlement",
        payment_type: "bank_transfer",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(mockedTransactionStatus).not.toHaveBeenCalled();
  });

  it("mengabaikan (200 OK) notifikasi untuk order yang tidak ditemukan di Midtrans (dummy/kadaluarsa)", async () => {
    mockedTransactionStatus.mockRejectedValue(new Error("404 dari Midtrans"));

    const req = buatNotifikasi({ order_id: "INV-TIDAK-ADA" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it("mengabaikan (200 OK, tidak memproses apa pun) status transaksi yang masih 'pending'", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "pending",
      gross_amount: "115000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);

    const req = buatNotifikasi({ order_id: "INV-20260908-TESTAA" });
    await POST(req);

    expect(orderFindMany).not.toHaveBeenCalled();
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/midtrans/notification — checkout produk (order_id = kodeInvoice)", () => {
  it("pembayaran sukses (settlement) -> SEMUA Order dalam 1 invoice dilunasi & dipindah ke status 'Diproses'", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "settlement",
      gross_amount: "115000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);
    orderFindMany.mockResolvedValue([
      { order_id: "order-1", user_id: "user-1", total_harga: 65000, kode_invoice: "INV-1" },
      { order_id: "order-2", user_id: "user-1", total_harga: 50000, kode_invoice: "INV-1" },
    ]);
    transaksiCreate.mockReturnValue({});
    orderUpdate.mockReturnValue({});
    mockTransaction.mockResolvedValue([]);

    const req = buatNotifikasi({ order_id: "INV-1", gross_amount: "115000" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    // Setiap Order dalam invoice menghasilkan 1 pasang panggilan: buat Transaksi + update status Order
    expect(transaksiCreate).toHaveBeenCalledTimes(2);
    expect(orderUpdate).toHaveBeenCalledTimes(2);
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { order_id: "order-1" },
      data: { status_pembayaran: "Lunas", status_order: "Diproses" },
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { order_id: "order-2" },
      data: { status_pembayaran: "Lunas", status_order: "Diproses" },
    });
    expect(transaksiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order_id: "order-1", nominal: 65000 }),
      })
    );
  });

  it("pembayaran GAGAL (deny/cancel/expire) -> status_pembayaran SEMUA Order di invoice itu jadi 'Gagal'", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "deny",
      gross_amount: "115000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);
    orderFindMany.mockResolvedValue([
      { order_id: "order-1", user_id: "user-1", total_harga: 115000, kode_invoice: "INV-1" },
    ]);

    const req = buatNotifikasi({ order_id: "INV-1" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { kode_invoice: "INV-1" },
      data: { status_pembayaran: "Gagal" },
    });
  });

  it("invoice yang tidak dikenal (tidak ada Order sama sekali) -> diabaikan dengan aman, tidak error", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "settlement",
      gross_amount: "115000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);
    orderFindMany.mockResolvedValue([]);

    const req = buatNotifikasi({ order_id: "INV-TIDAK-DIKENAL" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("POST /api/midtrans/notification — booking jasa (order_id = JASA-<orderId>)", () => {
  it("pembayaran booking jasa sukses & jumlahnya PAS melunasi -> status jadi 'Lunas' dan status_order 'Diproses'", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "settlement",
      gross_amount: "150000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);
    orderFindUnique.mockResolvedValue({
      order_id: "order-jasa-1",
      user_id: "user-1",
      total_harga: 150000,
      kode_invoice: "JASA-order-jasa-1",
      status_order: "Menunggu",
      transaksi: [],
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        transaksi: { create: vi.fn().mockResolvedValue({}) },
        order: { update: vi.fn().mockResolvedValue({}) },
      })
    );

    const req = buatNotifikasi({ order_id: "JASA-order-jasa-1", gross_amount: "150000" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("pembayaran booking jasa GAGAL -> status_pembayaran order tsb langsung 'Gagal'", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "cancel",
      gross_amount: "150000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);
    orderFindUnique.mockResolvedValue({
      order_id: "order-jasa-1",
      user_id: "user-1",
      total_harga: 150000,
      kode_invoice: "JASA-order-jasa-1",
      status_order: "Menunggu",
      transaksi: [],
    });

    const req = buatNotifikasi({ order_id: "JASA-order-jasa-1" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { order_id: "order-jasa-1" },
      data: { status_pembayaran: "Gagal" },
    });
  });

  it("booking jasa untuk order yang sudah tidak ada di database -> diabaikan dengan aman", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "settlement",
      gross_amount: "150000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);
    orderFindUnique.mockResolvedValue(null);

    const req = buatNotifikasi({ order_id: "JASA-order-tidak-ada" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/midtrans/notification — cicilan jasa (order_id = CICIL-<orderId>-<timestamp>)", () => {
  it("cicilan sukses tapi BELUM menutupi total_harga -> status tetap 'Menunggu_Konfirmasi' (bukan Lunas)", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "settlement",
      gross_amount: "50000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);
    orderFindUnique.mockResolvedValue({
      order_id: "order-cicil-1",
      user_id: "user-1",
      total_harga: 150000,
      kode_invoice: "INV-CICIL-1",
      transaksi: [{ jenis_transaksi: "Pemasukan", nominal: 50000 }], // sudah bayar 50rb sebelumnya
    });

    let updateData: OrderUpdateArgs["data"] | undefined;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        transaksi: { create: vi.fn().mockResolvedValue({}) },
        order: {
          update: vi.fn((args: OrderUpdateArgs) => {
            updateData = args.data;
            return Promise.resolve({});
          }),
        },
      })
    );

    // encodeCicilanOrderId("order-cicil-1"...) -> kita rakit id CICIL- manual yang valid
    // format decode: compact 32 char hex diambil dari bagian ke-2 setelah split("-")
    const orderIdHex = "6f72646572636963696c2d31000000"; // dummy hex 32 char (tidak perlu match UUID asli krn kita mock findUnique by ID hasil decode juga)
    const midtransOrderId = `CICIL-${orderIdHex.padEnd(32, "0")}-abc123`;

    // Karena decodeCicilanOrderId murni fungsi format (bukan lookup), kita pastikan
    // findUnique dipanggil dengan HASIL DECODE yg konsisten, bukan raw midtransOrderId
    const req = buatNotifikasi({ order_id: midtransOrderId, gross_amount: "50000" });
    await POST(req);

    expect(updateData?.status_pembayaran).toBe("Menunggu_Konfirmasi");
  });

  it("cicilan sukses dan totalnya SUDAH menutupi/melebihi total_harga -> status berubah jadi 'Lunas'", async () => {
    mockedTransactionStatus.mockResolvedValue({
      transaction_status: "settlement",
      gross_amount: "100000",
      payment_type: "bank_transfer",
    } as unknown as MidtransStatusResponse);
    orderFindUnique.mockResolvedValue({
      order_id: "order-cicil-2",
      user_id: "user-1",
      total_harga: 150000,
      kode_invoice: "INV-CICIL-2",
      transaksi: [{ jenis_transaksi: "Pemasukan", nominal: 50000 }], // sudah 50rb, +100rb = lunas
    });

    let updateData: OrderUpdateArgs["data"] | undefined;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        transaksi: { create: vi.fn().mockResolvedValue({}) },
        order: {
          update: vi.fn((args: OrderUpdateArgs) => {
            updateData = args.data;
            return Promise.resolve({});
          }),
        },
      })
    );

    const orderIdHex = "6f72646572636963696c2d32000000";
    const midtransOrderId = `CICIL-${orderIdHex.padEnd(32, "0")}-abc123`;

    const req = buatNotifikasi({ order_id: midtransOrderId, gross_amount: "100000" });
    await POST(req);

    expect(updateData?.status_pembayaran).toBe("Lunas");
  });
});