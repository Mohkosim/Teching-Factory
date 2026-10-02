import { describe, it, expect } from "vitest";
import { adalahPengeluaranKas, KODE } from "./coa";
const B = (kode: string, debit: number, kredit: number) => ({ kode, debit, kredit });
describe("adalahPengeluaranKas", () => {
  it("beban Dr + Kas Cr → true", () => expect(adalahPengeluaranKas([B(KODE.BEBAN_OPERASIONAL,100,0),B(KODE.KAS,0,100)])).toBe(true));
  it("pembelian (HPP) Dr + Kas Cr → true", () => expect(adalahPengeluaranKas([B(KODE.PEMBELIAN,100,0),B(KODE.KAS,0,100)])).toBe(true));
  it("akrual gaji (Dr beban, Cr utang akrual) → false", () => expect(adalahPengeluaranKas([B(KODE.BEBAN_GAJI,100,0),B(KODE.UTANG_AKRUAL,0,100)])).toBe(false));
  it("beban dimuka terpakai → false", () => expect(adalahPengeluaranKas([B(KODE.BEBAN_OPERASIONAL,100,0),B(KODE.BEBAN_DIMUKA,0,100)])).toBe(false));
  it("modal awal / prive / bayar ongkir → false", () => {
    expect(adalahPengeluaranKas([B(KODE.KAS,100,0),B(KODE.MODAL,0,100)])).toBe(false);
    expect(adalahPengeluaranKas([B(KODE.PRIVE,100,0),B(KODE.KAS,0,100)])).toBe(false);
    expect(adalahPengeluaranKas([B(KODE.UTANG_ONGKIR,100,0),B(KODE.KAS,0,100)])).toBe(false);
  });
});
