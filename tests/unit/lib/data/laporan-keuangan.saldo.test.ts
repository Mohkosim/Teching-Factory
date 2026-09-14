import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modul prisma SEBELUM diimpor oleh getSaldoJurusan, supaya tidak butuh
// koneksi database asli / Prisma Client yang di-generate.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order_Detail: { aggregate: vi.fn() },
    transaksi: { aggregate: vi.fn() },
    penarikanSaldo: { aggregate: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSaldoJurusan } from "@/lib/data/laporan-keuangan";

type AggregateMock = ReturnType<typeof vi.fn>;

function setupAggregates(opts: {
  pemasukan?: number | null;
  pengeluaran?: number | null;
  penarikan?: number | null;
  biayaMidtrans?: number | null;
}) {
  const orderDetailAggregate = prisma.order_Detail.aggregate as unknown as AggregateMock;
  const transaksiAggregate = prisma.transaksi.aggregate as unknown as AggregateMock;
  const penarikanAggregate = prisma.penarikanSaldo.aggregate as unknown as AggregateMock;

  orderDetailAggregate.mockResolvedValue({ _sum: { subtotal: opts.pemasukan ?? null } });

  // transaksi.aggregate dipanggil 2x: sekali untuk Pengeluaran, sekali untuk biaya_midtrans.
  // Kita bedakan berdasarkan urutan pemanggilan (Promise.all di kode sumber memanggil
  // pengeluaranAgg sebelum biayaMidtransAgg).
  transaksiAggregate
    .mockResolvedValueOnce({ _sum: { nominal: opts.pengeluaran ?? null } })
    .mockResolvedValueOnce({ _sum: { biaya_midtrans: opts.biayaMidtrans ?? null } });

  penarikanAggregate.mockResolvedValue({ _sum: { nominal: opts.penarikan ?? null } });
}

describe("getSaldoJurusan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menghitung saldoTersedia = pemasukan - biayaMidtrans - penarikan", async () => {
    setupAggregates({ pemasukan: 1_000_000, pengeluaran: 200_000, penarikan: 100_000, biayaMidtrans: 10_000 });

    const hasil = await getSaldoJurusan("jurusan-1");

    expect(hasil).toEqual({
      saldoTersedia: 1_000_000 - 10_000 - 100_000,
      totalPemasukan: 1_000_000,
      totalPengeluaran: 200_000,
      totalPenarikan: 100_000,
      totalBiayaMidtrans: 10_000,
    });
  });

  it("tidak pernah mengembalikan saldoTersedia negatif (dibatasi minimal 0)", async () => {
    setupAggregates({ pemasukan: 50_000, penarikan: 200_000, biayaMidtrans: 0 });

    const hasil = await getSaldoJurusan("jurusan-1");

    expect(hasil.saldoTersedia).toBe(0);
  });

  it("menganggap 0 jika salah satu agregat prisma mengembalikan null (belum ada transaksi sama sekali)", async () => {
    setupAggregates({ pemasukan: null, pengeluaran: null, penarikan: null, biayaMidtrans: null });

    const hasil = await getSaldoJurusan("jurusan-baru");

    expect(hasil).toEqual({
      saldoTersedia: 0,
      totalPemasukan: 0,
      totalPengeluaran: 0,
      totalPenarikan: 0,
      totalBiayaMidtrans: 0,
    });
  });

  it("[dokumentasi bug diketahui] biaya Midtrans untuk order lintas-jurusan dipotong utuh, bukan proporsional", async () => {
    // Kasus: 1 Order berisi produk dari 2 jurusan berbeda dalam 1 checkout gabungan.
    // biaya_midtrans disimpan di level Transaksi (1 baris per Order), sehingga ketika
    // dua jurusan sama-sama menjadi bagian dari Order itu, WHERE clause pada
    // biayaMidtransAgg akan mengambil biaya_midtrans PENUH untuk masing-masing jurusan,
    // padahal seharusnya hanya proporsi subtotal jurusan tsb yang dipotong (bandingkan
    // dengan prosesCheckoutProduk() di webhook, yang SUDAH memproporsikan per Order).
    // Test ini mendokumentasikan perilaku SAAT INI (bukan perilaku yang diinginkan) agar
    // regresi/bugfix di kemudian hari mudah dideteksi lewat kegagalan test ini.
    const biayaMidtransSatuOrder = 20_000;

    setupAggregates({
      pemasukan: 300_000, // subtotal khusus jurusan ini saja
      biayaMidtrans: biayaMidtransSatuOrder, // ikut mengambil biaya penuh 1 Order
      penarikan: 0,
    });

    const hasilJurusanA = await getSaldoJurusan("jurusan-a");

    expect(hasilJurusanA.totalBiayaMidtrans).toBe(biayaMidtransSatuOrder);
    expect(hasilJurusanA.saldoTersedia).toBe(300_000 - biayaMidtransSatuOrder);
  });
});
