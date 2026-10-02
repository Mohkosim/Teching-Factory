import { describe, it, expect } from "vitest";
import {
    bangunJurnalOtomatis,
    bukuBesar,
    labaRugi,
    neraca,
    neracaSaldo,
    perubahanEkuitas,
    arusKas,
    validasiSistem,
    validasiBarisManual,
    saldoAkunPer,
    type SumberAkuntansi,
    type SumberOrder,
} from "./engine";

const w = (tgl: string) => new Date(`${tgl}T05:00:00Z`);

function orderProduk(p: Partial<SumberOrder> = {}): SumberOrder {
    return {
        orderId: "ord-A-000001",
        kode: "INV-A",
        statusOrder: "Diterima",
        statusPembayaran: "Lunas",
        produk: 100_000,
        jasa: 0,
        subtotalOrder: 100_000,
        ongkirOrder: 10_000,
        diterimaAt: w("2026-09-05"),
        updatedAt: w("2026-09-05"),
        pembayaran: [{ id: "pay-A-000001", tanggal: w("2026-09-01"), nominal: 110_000, biayaMidtrans: 770 }],
        refund: null,
        ...p,
    };
}

function sumber(p: Partial<SumberAkuntansi> = {}): SumberAkuntansi {
    return { order: [], pengeluaran: [], penarikan: [], manual: [], ...p };
}

const modalAwal = (tgl = "2026-08-31", nominal = 1_000_000) => ({
    id: "man-modal-0001",
    tanggal: w(tgl),
    createdAt: w(tgl),
    tipe: "ModalAwal" as const,
    keterangan: "Modal awal",
    baris: [
        { kode: "1110", debit: nominal, kredit: 0 },
        { kode: "3100", debit: 0, kredit: nominal },
    ],
});

describe("jurnal otomatis — penjualan produk", () => {
    it("membagi pembayaran: ongkir jadi utang ongkir, sisanya pendapatan diterima di muka", () => {
        const { jurnal } = bangunJurnalOtomatis(sumber({ order: [orderProduk({ statusOrder: "Diproses", diterimaAt: null })] }));
        const bayar = jurnal.find((j) => j.jenis === "Pembayaran")!;
        expect(bayar.baris).toEqual([
            { kode: "1120", debit: 110_000, kredit: 0 },
            { kode: "2100", debit: 0, kredit: 10_000 },
            { kode: "2200", debit: 0, kredit: 100_000 },
        ]);
        const fee = jurnal.find((j) => j.jenis === "Biaya Midtrans")!;
        expect(fee.baris).toEqual([
            { kode: "5230", debit: 770, kredit: 0 },
            { kode: "1120", debit: 0, kredit: 770 },
        ]);
        expect(jurnal.some((j) => j.jenis === "Pengakuan Pendapatan")).toBe(false);
        expect(labaRugi(jurnal, { sampai: "2026-09-30" }).pendapatanBersih).toBe(0);
    });

    it("mengakui pendapatan (jurnal penyesuaian otomatis) saat pesanan Diterima; ongkir BUKAN pendapatan", () => {
        const { jurnal } = bangunJurnalOtomatis(sumber({ order: [orderProduk()] }));
        const rec = jurnal.find((j) => j.jenis === "Pengakuan Pendapatan")!;
        expect(rec.tipe).toBe("Penyesuaian");
        expect(rec.tanggal).toBe("2026-09-05");
        expect(rec.baris).toEqual([
            { kode: "2200", debit: 100_000, kredit: 0 },
            { kode: "4100", debit: 0, kredit: 100_000 },
        ]);
        const lr = labaRugi(jurnal, { sampai: "2026-09-30" });
        expect(lr.penjualanProduk).toBe(100_000);
        expect(lr.bebanMidtrans).toBe(770);
        expect(lr.labaBersih).toBe(99_230);
    });

    it("order dengan banyak item tidak dihitung berlipat (bug lama laporan)", () => {
        const o = orderProduk({ produk: 90_000, subtotalOrder: 90_000, ongkirOrder: 0, pembayaran: [{ id: "pay-B-000002", tanggal: w("2026-09-01"), nominal: 90_000, biayaMidtrans: 0 }] });
        const { jurnal } = bangunJurnalOtomatis(sumber({ order: [o] }));
        expect(labaRugi(jurnal, { sampai: "2026-09-30" }).penjualanProduk).toBe(90_000);
    });

    it("order campuran 2 jurusan: hanya bagian jurusan ini (proporsional) yang dijurnal", () => {
        const o = orderProduk({ produk: 60_000, subtotalOrder: 100_000, ongkirOrder: 10_000, pembayaran: [{ id: "pay-C-000003", tanggal: w("2026-09-01"), nominal: 110_000, biayaMidtrans: 1_000 }] });
        const { jurnal } = bangunJurnalOtomatis(sumber({ order: [o] }));
        const bayar = jurnal.find((j) => j.jenis === "Pembayaran")!;
        expect(bayar.baris.find((b) => b.kode === "1120")!.debit).toBe(66_000);
        expect(bayar.baris.find((b) => b.kode === "2100")!.kredit).toBe(6_000);
        expect(jurnal.find((j) => j.jenis === "Biaya Midtrans")!.baris[0].debit).toBe(600);
    });
});

describe("jurnal otomatis — jasa dengan DP/cicilan", () => {
    it("DP dulu → jasa selesai dengan piutang → pelunasan setelah selesai menutup piutang", () => {
        const o: SumberOrder = {
            orderId: "ord-J-000004",
            kode: "INV-J",
            statusOrder: "Selesai",
            statusPembayaran: "Lunas",
            produk: 0,
            jasa: 200_000,
            subtotalOrder: 200_000,
            ongkirOrder: 0,
            diterimaAt: w("2026-09-10"),
            updatedAt: w("2026-09-10"),
            pembayaran: [
                { id: "pay-J1-00005", tanggal: w("2026-09-02"), nominal: 100_000, biayaMidtrans: 0 },
                { id: "pay-J2-00006", tanggal: w("2026-09-15"), nominal: 100_000, biayaMidtrans: 0 },
            ],
            refund: null,
        };
        const { jurnal } = bangunJurnalOtomatis(sumber({ order: [o] }));
        const rec = jurnal.find((j) => j.jenis === "Pengakuan Pendapatan")!;
        expect(rec.baris).toEqual([
            { kode: "2200", debit: 100_000, kredit: 0 },
            { kode: "1200", debit: 100_000, kredit: 0 },
            { kode: "4200", debit: 0, kredit: 200_000 },
        ]);
        const pelunasan = jurnal.filter((j) => j.jenis === "Pembayaran")[1];
        expect(pelunasan.baris).toContainEqual({ kode: "1200", debit: 0, kredit: 100_000 });

        const nr = neraca(jurnal, { sampai: "2026-09-30" });
        expect(nr.aset.find((a) => a.kode === "1200")).toBeUndefined();
        expect(nr.kewajiban).toHaveLength(0);
        expect(labaRugi(jurnal, { sampai: "2026-09-30" }).pendapatanBersih).toBe(200_000);
    });
});

describe("jurnal otomatis — refund", () => {
    it("refund setelah diakui → retur penjualan, ongkir dikembalikan, kas platform berkurang", () => {
        const o = orderProduk({ refund: { status: "Disetujui", tanggal: w("2026-09-08") } });
        const { jurnal } = bangunJurnalOtomatis(sumber({ order: [o] }));
        const ref = jurnal.find((j) => j.jenis === "Refund")!;
        expect(ref.baris).toEqual([
            { kode: "4300", debit: 100_000, kredit: 0 },
            { kode: "2100", debit: 10_000, kredit: 0 },
            { kode: "1120", debit: 0, kredit: 110_000 },
        ]);
        const lr = labaRugi(jurnal, { sampai: "2026-09-30" });
        expect(lr.pendapatanBersih).toBe(0);
        expect(lr.labaBersih).toBe(-770);
    });

    it("refund SEBELUM diterima → pendapatan tidak pernah diakui", () => {
        const o = orderProduk({ statusOrder: "Selesai", refund: { status: "Disetujui", tanggal: w("2026-09-03") } });
        const { jurnal } = bangunJurnalOtomatis(sumber({ order: [o] }));
        expect(jurnal.some((j) => j.jenis === "Pengakuan Pendapatan")).toBe(false);
        const ref = jurnal.find((j) => j.jenis === "Refund")!;
        expect(ref.baris[0]).toEqual({ kode: "2200", debit: 100_000, kredit: 0 });
    });

    it("refund berstatus Diajukan/Ditolak tidak menghasilkan jurnal", () => {
        const o = orderProduk({ refund: { status: "Ditolak", tanggal: w("2026-09-08") } });
        const { jurnal } = bangunJurnalOtomatis(sumber({ order: [o] }));
        expect(jurnal.some((j) => j.jenis === "Refund")).toBe(false);
    });

    it("pesanan dibatalkan tanpa refund → peringatan", () => {
        const o = orderProduk({ statusOrder: "Dibatalkan", diterimaAt: null });
        const { peringatan } = bangunJurnalOtomatis(sumber({ order: [o] }));
        expect(peringatan).toHaveLength(1);
    });
});

describe("pengeluaran, penarikan, modal awal, penyesuaian", () => {
    const data = sumber({
        order: [orderProduk()],
        pengeluaran: [
            { id: "png-1-000007", tanggal: w("2026-09-02"), nominal: 30_000, kategori: "Bahan Baku", nama: "Kayu", deskripsi: null },
            { id: "png-2-000008", tanggal: w("2026-09-03"), nominal: 20_000, kategori: "Gaji Karyawan", nama: "Gaji", deskripsi: null },
            { id: "png-3-000009", tanggal: w("2026-09-04"), nominal: 5_000, kategori: "Kategori Aneh", nama: null, deskripsi: "lain" },
        ],
        penarikan: [{ id: "tarik-1-00010", tanggal: w("2026-09-20"), nominal: 50_000 }],
        manual: [
            modalAwal(),
            {
                id: "man-persediaan-01",
                tanggal: w("2026-09-30"),
                createdAt: w("2026-09-30"),
                tipe: "Penyesuaian",
                keterangan: "Persediaan akhir",
                baris: [
                    { kode: "1300", debit: 8_000, kredit: 0 },
                    { kode: "5110", debit: 0, kredit: 8_000 },
                ],
            },
            {
                id: "man-akrual-gaji-01",
                tanggal: w("2026-09-30"),
                createdAt: w("2026-09-30"),
                tipe: "Penyesuaian",
                keterangan: "Akrual gaji",
                baris: [
                    { kode: "5210", debit: 12_000, kredit: 0 },
                    { kode: "2300", debit: 0, kredit: 12_000 },
                ],
            },
        ],
    });
    const { jurnal } = bangunJurnalOtomatis(data);

    it("kategori pengeluaran dipetakan ke akun yang benar (kategori tak dikenal → Beban Lainnya)", () => {
        const png = jurnal.filter((j) => j.jenis === "Pengeluaran");
        expect(png.map((j) => j.baris[0].kode).sort()).toEqual(["5110", "5210", "5290"]);
    });

    it("Neraca Saldo sebelum penyesuaian mengabaikan jurnal penyesuaian, keduanya seimbang", () => {
        const awal = neracaSaldo(jurnal, { sampai: "2026-09-30", tanpaPenyesuaian: true });
        const sesuai = neracaSaldo(jurnal, { sampai: "2026-09-30" });
        expect(awal.seimbang).toBe(true);
        expect(sesuai.seimbang).toBe(true);
        expect(awal.baris.find((b) => b.akun.kode === "4100")).toBeUndefined();
        expect(awal.baris.find((b) => b.akun.kode === "2200")!.saldoKredit).toBe(100_000);
        expect(sesuai.baris.find((b) => b.akun.kode === "4100")!.saldoKredit).toBe(100_000);
        expect(sesuai.baris.find((b) => b.akun.kode === "2300")!.saldoKredit).toBe(12_000);
    });

    it("Laba Rugi: HPP = persediaan awal + pembelian − persediaan akhir", () => {
        const lr = labaRugi(jurnal, { mulai: "2026-09-01", sampai: "2026-09-30" });
        expect(lr.pembelian).toBe(30_000);
        expect(lr.persediaanAkhir).toBe(8_000);
        expect(lr.hpp).toBe(22_000);
        expect(lr.selisihHpp).toBe(0);
        expect(lr.pendapatanBersih).toBe(100_000);
        expect(lr.labaKotor).toBe(78_000);
        expect(lr.bebanGaji).toBe(32_000);
        expect(lr.bebanLainnya).toBe(5_000);
        expect(lr.bebanMidtrans).toBe(770);
        expect(lr.labaBersih).toBe(78_000 - 32_000 - 5_000 - 770);
    });

    it("Neraca seimbang dan kas = saldo Buku Besar kas + platform", () => {
        const nr = neraca(jurnal, { sampai: "2026-09-30" });
        expect(nr.seimbang).toBe(true);
        expect(nr.totalAset).toBe(nr.totalKewajibanEkuitas);
        const bb = bukuBesar(jurnal, "1110", { sampai: "2026-09-30" }).saldoAkhir + bukuBesar(jurnal, "1120", { sampai: "2026-09-30" }).saldoAkhir;
        expect(bb).toBe(nr.totalKas);
    });

    it("Penarikan saldo hanya memindahkan kas (tidak mengubah total kas / laba)", () => {
        const sebelum = neraca(jurnal.filter((j) => j.jenis !== "Penarikan Saldo"), { sampai: "2026-09-30" });
        const sesudah = neraca(jurnal, { sampai: "2026-09-30" });
        expect(sesudah.totalKas).toBe(sebelum.totalKas);
        expect(sesudah.labaBerjalan).toBe(sebelum.labaBerjalan);
    });

    it("Arus kas: saldo awal + arus bersih = saldo akhir; modal masuk pendanaan; penarikan tidak dihitung", () => {
        const ak = arusKas(jurnal, { mulai: "2026-09-01", sampai: "2026-09-30" });
        expect(ak.saldoAwal).toBe(1_000_000);
        expect(ak.saldoAwal + ak.arusBersih).toBe(ak.saldoAkhir);
        expect(ak.pendanaan.items).toHaveLength(0);
        const penerimaan = ak.operasi.items.find((i) => i.label.startsWith("Penerimaan dari pelanggan"))!;
        expect(penerimaan.masuk).toBe(110_000);
        expect(ak.operasi.items.some((i) => i.label.includes("Prive") || i.label.includes("Penarikan"))).toBe(false);

        const akAwal = arusKas(jurnal, { sampai: "2026-09-30" });
        expect(akAwal.pendanaan.masuk).toBe(1_000_000);
        expect(akAwal.saldoAkhir).toBe(neraca(jurnal, { sampai: "2026-09-30" }).totalKas);
    });

    it("Perubahan Ekuitas: awal + laba − prive = ekuitas neraca", () => {
        const eq = perubahanEkuitas(jurnal, { mulai: "2026-09-01", sampai: "2026-09-30" });
        const nr = neraca(jurnal, { sampai: "2026-09-30" });
        expect(eq.ekuitasAwal).toBe(1_000_000);
        expect(eq.ekuitasAkhir).toBe(nr.totalEkuitas);
    });

    it("Validasi sistem: semua cek lulus", () => {
        const v = validasiSistem(jurnal, "2026-09-30");
        expect(v.cek.filter((c) => !c.valid)).toEqual([]);
        expect(v.valid).toBe(true);
    });

    it("saldoAkunPer dipakai form persediaan akhir", () => {
        expect(saldoAkunPer(jurnal, "1300", "2026-09-29")).toBe(0);
        expect(saldoAkunPer(jurnal, "1300", "2026-09-30")).toBe(8_000);
    });
});

describe("validasi mendeteksi masalah data", () => {
    it("Utang Ongkir yang dibayar melebihi saldo → saldo abnormal → tidak valid", () => {
        const data = sumber({
            order: [orderProduk()],
            manual: [
                modalAwal(),
                {
                    id: "man-ongkir-0001",
                    tanggal: w("2026-09-06"),
                    createdAt: w("2026-09-06"),
                    tipe: "Umum",
                    keterangan: "Bayar ongkir kelebihan",
                    baris: [
                        { kode: "2100", debit: 25_000, kredit: 0 },
                        { kode: "1110", debit: 0, kredit: 25_000 },
                    ],
                },
            ],
        });
        const { jurnal } = bangunJurnalOtomatis(data);
        const v = validasiSistem(jurnal, "2026-09-30");
        expect(v.valid).toBe(false);
        expect(v.cek.find((c) => c.id === "saldo_abnormal")!.valid).toBe(false);
        expect(v.cek.find((c) => c.id === "aset_kewajiban_ekuitas")!.valid).toBe(true);
    });
});

describe("validasiBarisManual", () => {
    it("menerima jurnal seimbang", () => {
        const r = validasiBarisManual([
            { kode: "1110", debit: 5000, kredit: 0 },
            { kode: "3100", debit: 0, kredit: 5000 },
        ]);
        expect(r.ok).toBe(true);
    });
    it("menolak tidak seimbang, akun asing, nominal negatif, debit+kredit sekaligus", () => {
        expect(validasiBarisManual([{ kode: "1110", debit: 5000, kredit: 0 }, { kode: "3100", debit: 0, kredit: 4000 }]).ok).toBe(false);
        expect(validasiBarisManual([{ kode: "9999", debit: 5000, kredit: 0 }, { kode: "3100", debit: 0, kredit: 5000 }]).ok).toBe(false);
        expect(validasiBarisManual([{ kode: "1110", debit: -5000, kredit: 0 }, { kode: "3100", debit: 0, kredit: -5000 }]).ok).toBe(false);
        expect(validasiBarisManual([{ kode: "1110", debit: 5000, kredit: 5000 }, { kode: "3100", debit: 0, kredit: 0 }]).ok).toBe(false);
        expect(validasiBarisManual([{ kode: "1110", debit: 5000, kredit: 0 }]).ok).toBe(false);
    });
});
