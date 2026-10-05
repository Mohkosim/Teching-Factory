import { describe, it, expect } from "vitest";
import { jurnalDariManual, validasiBarisManual, totalPerAkun, saldoAkun } from "@/lib/akuntansi/engine";
import { AKUN_MAP, KODE, TEMPLATE_JURNAL, TEMPLATE_MAP } from "@/lib/akuntansi/coa";

const manual = (override: Partial<Parameters<typeof jurnalDariManual>[0]> = {}) => ({
  id: "abcdef12-0000-0000-0000-000000000000",
  tanggal: new Date("2026-10-01T05:00:00.000Z"),
  createdAt: new Date("2026-10-02T03:30:00.000Z"),
  tipe: "Umum" as const,
  keterangan: "Jurnal uji",
  baris: [
    { kode: KODE.PRIVE, debit: 100_000, kredit: 0 },
    { kode: KODE.KAS, debit: 0, kredit: 100_000 },
  ],
  ...override,
});

describe("jurnalDariManual - pemetaan tipe & jenis", () => {
  it.each([
    ["ModalAwal", "Umum", "Modal Awal"],
    ["Umum", "Umum", "Jurnal Umum"],
    ["Penyesuaian", "Penyesuaian", "Penyesuaian"],
  ] as const)("tipe manual %s -> tipe jurnal %s, jenis '%s'", (tipeManual, tipe, jenis) => {
    const j = jurnalDariManual(manual({ tipe: tipeManual }));

    expect(j.tipe).toBe(tipe);
    expect(j.jenis).toBe(jenis);
  });

  it("ditandai bukan otomatis, tanpa sumber, dan manualId = id jurnal manual", () => {
    const j = jurnalDariManual(manual());

    expect(j.otomatis).toBe(false);
    expect(j.sumber).toBeNull();
    expect(j.manualId).toBe(manual().id);
    expect(j.id).toBe(manual().id);
  });

  it("keterangan dan baris diteruskan apa adanya", () => {
    const j = jurnalDariManual(manual());

    expect(j.keterangan).toBe("Jurnal uji");
    expect(j.baris).toEqual(manual().baris);
  });
});

describe("jurnalDariManual - tanggal (WIB)", () => {
  it("tanggal 05:00 UTC tetap jatuh di hari yang sama dalam WIB", () => {
    expect(jurnalDariManual(manual()).tanggal).toBe("2026-10-01");
  });

  it("tanggal 18:00 UTC (01:00 WIB hari berikutnya) bergeser ke hari WIB berikutnya", () => {
    const j = jurnalDariManual(manual({ tanggal: new Date("2026-10-01T18:00:00.000Z") }));

    expect(j.tanggal).toBe("2026-10-02");
  });

  it("jurnal dengan tanggal sama diurutkan berdasarkan waktu pembuatan", () => {
    const awal = jurnalDariManual(manual({ id: "a", createdAt: new Date("2026-10-02T01:00:00.000Z") }));
    const akhir = jurnalDariManual(manual({ id: "b", createdAt: new Date("2026-10-02T09:00:00.000Z") }));

    expect(akhir.waktu).toBeGreaterThan(awal.waktu);
  });

  it("kode jurnal unik per id dan memuat penanda manual", () => {
    const a = jurnalDariManual(manual({ id: "aaaaaaaa-1" }));
    const b = jurnalDariManual(manual({ id: "bbbbbbbb-2" }));

    expect(a.kode).not.toBe(b.kode);
    expect(a.kode).toContain("-M");
  });
});

describe("jurnalDariManual - pengaruh ke saldo akun", () => {
  it("modal awal menambah Kas (debit) dan Modal (kredit)", () => {
    const j = jurnalDariManual(
      manual({
        tipe: "ModalAwal",
        baris: [
          { kode: KODE.KAS, debit: 5_000_000, kredit: 0 },
          { kode: KODE.MODAL, debit: 0, kredit: 5_000_000 },
        ],
      })
    );
    const total = totalPerAkun([j]);

    expect(saldoAkun(total, KODE.KAS)).toBe(5_000_000);
    expect(saldoAkun(total, KODE.MODAL)).toBe(5_000_000);
  });

  it("prive mengurangi Kas dan menambah saldo debit Prive", () => {
    const modal = jurnalDariManual(
      manual({
        id: "m1",
        tipe: "ModalAwal",
        baris: [
          { kode: KODE.KAS, debit: 1_000_000, kredit: 0 },
          { kode: KODE.MODAL, debit: 0, kredit: 1_000_000 },
        ],
      })
    );
    const prive = jurnalDariManual(manual({ id: "m2" }));
    const total = totalPerAkun([modal, prive]);

    expect(saldoAkun(total, KODE.KAS)).toBe(900_000);
    expect(saldoAkun(total, KODE.PRIVE)).toBe(100_000);
  });

  it("jurnal Penyesuaian dikecualikan saat filter tanpaPenyesuaian", () => {
    const j = jurnalDariManual(
      manual({
        tipe: "Penyesuaian",
        baris: [
          { kode: KODE.BEBAN_GAJI, debit: 400_000, kredit: 0 },
          { kode: KODE.UTANG_AKRUAL, debit: 0, kredit: 400_000 },
        ],
      })
    );

    expect(saldoAkun(totalPerAkun([j]), KODE.BEBAN_GAJI)).toBe(400_000);
    expect(saldoAkun(totalPerAkun([j], { tanpaPenyesuaian: true }), KODE.BEBAN_GAJI)).toBe(0);
  });
});

describe("TEMPLATE_JURNAL - konsistensi katalog template", () => {
  it("id template unik dan TEMPLATE_MAP memuat semuanya", () => {
    const ids = TEMPLATE_JURNAL.map((t) => t.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(TEMPLATE_MAP).sort()).toEqual([...ids].sort());
  });

  it("setiap template memakai akun yang ada di COA", () => {
    for (const t of TEMPLATE_JURNAL) {
      expect(AKUN_MAP[t.debit], `akun debit ${t.id}`).toBeDefined();
      expect(AKUN_MAP[t.kredit], `akun kredit ${t.id}`).toBeDefined();
    }
  });

  it("template dengan nominal sama selalu menghasilkan jurnal yang lolos validasi", () => {
    for (const t of TEMPLATE_JURNAL) {
      const r = validasiBarisManual([
        { kode: t.debit, debit: 10_000, kredit: 0 },
        { kode: t.kredit, debit: 0, kredit: 10_000 },
      ]);

      expect(r.ok, `template ${t.id}`).toBe(true);
    }
  });

  it("hanya ada satu template persediaan akhir, dan bertipe Penyesuaian", () => {
    const persediaan = TEMPLATE_JURNAL.filter((t) => t.persediaanAkhir);

    expect(persediaan).toHaveLength(1);
    expect(persediaan[0].tipe).toBe("Penyesuaian");
  });
});
