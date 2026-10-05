import { describe, it, expect } from "vitest";
import { hitungBiayaMidtrans } from "@/lib/midtrans/hitungBiaya";

describe("hitungBiayaMidtrans", () => {
  describe("bank_transfer & echannel (VA)", () => {
    it("selalu mengembalikan biaya flat Rp4.440, terlepas dari nominal", () => {
      expect(hitungBiayaMidtrans("bank_transfer", 315000)).toBe(4440);
      expect(hitungBiayaMidtrans("bank_transfer", 1_000_000)).toBe(4440);
      expect(hitungBiayaMidtrans("bank_transfer", 0)).toBe(4440);
    });

    it("echannel memakai tarif flat yang sama dengan bank_transfer", () => {
      expect(hitungBiayaMidtrans("echannel", 500000)).toBe(
        hitungBiayaMidtrans("bank_transfer", 500000)
      );
    });
  });

  describe("qris", () => {
    it("menghitung 0.7% dari gross_amount (cocok dengan data dashboard)", () => {
      // Rp2.300.000 -> Rp16.100 (persis 0.7%)
      expect(hitungBiayaMidtrans("qris", 2_300_000)).toBe(16100);
    });

    it("membulatkan hasil ke bilangan bulat terdekat", () => {
      // 100 * 0.007 = 0.7 -> dibulatkan ke 1
      expect(hitungBiayaMidtrans("qris", 100)).toBe(1);
    });

    it("mengembalikan 0 untuk gross_amount 0", () => {
      expect(hitungBiayaMidtrans("qris", 0)).toBe(0);
    });
  });

  describe("credit_card", () => {
    it("menghitung (2.9% * gross + Rp2.000) lalu menambahkan 11% (PPN)", () => {
      const gross = 1_000_000;
      const mdr = gross * 0.029 + 2000; // 31000
      const expected = Math.round(mdr * 1.11); // 34410
      expect(hitungBiayaMidtrans("credit_card", gross)).toBe(expected);
    });

    it("tetap mengenakan biaya admin Rp2.000 meski gross_amount 0", () => {
      const expected = Math.round(2000 * 1.11);
      expect(hitungBiayaMidtrans("credit_card", 0)).toBe(expected);
    });
  });

  describe("gopay & shopeepay", () => {
    it("menghitung 2% dari gross_amount, PPN sudah termasuk", () => {
      expect(hitungBiayaMidtrans("gopay", 333000)).toBe(Math.round(333000 * 0.02));
      expect(hitungBiayaMidtrans("shopeepay", 333000)).toBe(Math.round(333000 * 0.02));
    });
  });

  describe("payment type tidak dikenal", () => {
    it("mengembalikan 0 untuk payment type yang tidak ada di daftar", () => {
      expect(hitungBiayaMidtrans("cstore", 100000)).toBe(0);
      expect(hitungBiayaMidtrans("", 100000)).toBe(0);
      expect(hitungBiayaMidtrans("akulaku", 100000)).toBe(0);
    });
  });

  describe("nilai negatif (guard, seharusnya tidak terjadi di produksi)", () => {
    it("tidak melempar error untuk gross_amount negatif", () => {
      expect(() => hitungBiayaMidtrans("qris", -1000)).not.toThrow();
    });
  });
});