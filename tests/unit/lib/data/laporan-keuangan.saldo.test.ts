import { describe, it, expect, vi, beforeEach } from "vitest";

// Saldo jurusan sekarang dihitung dari JURNAL akuntansi (bukan lagi dari agregat
// order_Detail/transaksi/penarikanSaldo), jadi yang di-mock adalah loader jurnalnya.
// Prisma tetap di-mock supaya tidak butuh koneksi database / Prisma Client asli.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/akuntansi/loader", () => ({
  getAkuntansiJurusan: vi.fn(),
}));

import { getAkuntansiJurusan } from "@/lib/akuntansi/loader";
import { getSaldoJurusan, hitungSaldoDariJurnal } from "@/lib/data/laporan-keuangan";
import { KODE } from "@/lib/akuntansi/coa";
import { tanggalWIB, type Jurnal, type BarisJurnal } from "@/lib/akuntansi/engine";

const mockedGetAkuntansi = vi.mocked(getAkuntansiJurusan);

let urut = 0;
function jurnal(tanggal: string, baris: BarisJurnal[], jenis: Jurnal["jenis"] = "Jurnal Umum"): Jurnal {
  urut += 1;
  return {
    id: `j-${urut}`,
    kode: `JU-${urut}`,
    tanggal,
    waktu: urut,
    tipe: "Umum",
    jenis,
    keterangan: "uji",
    otomatis: true,
    sumber: null,
    baris,
    manualId: null,
  };
}

const D = (kode: string, nominal: number): BarisJurnal => ({ kode, debit: nominal, kredit: 0 });
const K = (kode: string, nominal: number): BarisJurnal => ({ kode, debit: 0, kredit: nominal });

beforeEach(() => {
  vi.clearAllMocks();
  urut = 0;
});

describe("hitungSaldoDariJurnal", () => {
  it("saldoTersedia = saldo akun Saldo Platform (pembayaran masuk - biaya Midtrans - penarikan)", () => {
    const data = [
      jurnal("2026-09-01", [D(KODE.SALDO_PLATFORM, 1_000_000), K(KODE.PDM, 1_000_000)], "Pembayaran"),
      jurnal("2026-09-01", [D(KODE.BEBAN_MIDTRANS, 10_000), K(KODE.SALDO_PLATFORM, 10_000)], "Biaya Midtrans"),
      jurnal("2026-09-05", [D(KODE.KAS, 100_000), K(KODE.SALDO_PLATFORM, 100_000)], "Penarikan Saldo"),
    ];

    const hasil = hitungSaldoDariJurnal(data, "2026-09-30");

    expect(hasil).toEqual({
      saldoTersedia: 1_000_000 - 10_000 - 100_000,
      totalBiayaMidtrans: 10_000,
    });
  });

  it("tidak pernah mengembalikan saldoTersedia negatif (dibatasi minimal 0)", () => {
    const data = [
      jurnal("2026-09-01", [D(KODE.SALDO_PLATFORM, 50_000), K(KODE.PDM, 50_000)], "Pembayaran"),
      jurnal("2026-09-02", [D(KODE.KAS, 200_000), K(KODE.SALDO_PLATFORM, 200_000)], "Penarikan Saldo"),
    ];

    expect(hitungSaldoDariJurnal(data, "2026-09-30").saldoTersedia).toBe(0);
  });

  it("belum ada jurnal sama sekali -> semua 0", () => {
    expect(hitungSaldoDariJurnal([], "2026-09-30")).toEqual({
      saldoTersedia: 0,
      totalBiayaMidtrans: 0,
    });
  });

  it("jurnal bertanggal SETELAH hari ini tidak ikut dihitung, jurnal tepat hari ini ikut (inklusif)", () => {
    const data = [
      jurnal("2026-09-30", [D(KODE.SALDO_PLATFORM, 300_000), K(KODE.PDM, 300_000)], "Pembayaran"),
      jurnal("2026-10-01", [D(KODE.SALDO_PLATFORM, 700_000), K(KODE.PDM, 700_000)], "Pembayaran"),
    ];

    expect(hitungSaldoDariJurnal(data, "2026-09-30").saldoTersedia).toBe(300_000);
  });

  it("akun lain (mis. Kas jurusan) tidak ikut menambah saldo tersedia di platform", () => {
    const data = [
      jurnal("2026-09-01", [D(KODE.KAS, 5_000_000), K(KODE.MODAL, 5_000_000)], "Modal Awal"),
    ];

    expect(hitungSaldoDariJurnal(data, "2026-09-30").saldoTersedia).toBe(0);
  });
});

describe("getSaldoJurusan", () => {
  it("mengambil jurnal milik jurusan yang diminta, lalu menghitung saldo sampai hari ini (WIB)", async () => {
    const hariIni = tanggalWIB(new Date());
    mockedGetAkuntansi.mockResolvedValue({
      jurnal: [
        jurnal(hariIni, [D(KODE.SALDO_PLATFORM, 400_000), K(KODE.PDM, 400_000)], "Pembayaran"),
        jurnal(hariIni, [D(KODE.BEBAN_MIDTRANS, 4_000), K(KODE.SALDO_PLATFORM, 4_000)], "Biaya Midtrans"),
      ],
      peringatan: [],
    });

    const hasil = await getSaldoJurusan("jurusan-1");

    expect(mockedGetAkuntansi).toHaveBeenCalledWith("jurusan-1");
    expect(hasil).toEqual({ saldoTersedia: 396_000, totalBiayaMidtrans: 4_000 });
  });

  it("jurusan baru tanpa transaksi -> saldo 0", async () => {
    mockedGetAkuntansi.mockResolvedValue({ jurnal: [], peringatan: [] });

    const hasil = await getSaldoJurusan("jurusan-baru");

    expect(hasil).toEqual({ saldoTersedia: 0, totalBiayaMidtrans: 0 });
  });

  it("jurnal yang tanggalnya masih di masa depan tidak dihitung sebagai saldo tersedia", async () => {
    mockedGetAkuntansi.mockResolvedValue({
      jurnal: [jurnal("2999-01-01", [D(KODE.SALDO_PLATFORM, 900_000), K(KODE.PDM, 900_000)], "Pembayaran")],
      peringatan: [],
    });

    const hasil = await getSaldoJurusan("jurusan-1");

    expect(hasil.saldoTersedia).toBe(0);
  });
});
