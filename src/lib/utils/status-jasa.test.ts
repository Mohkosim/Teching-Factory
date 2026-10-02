import { describe, it, expect } from "vitest";
import { adminBolehMengelola, bolehDiselesaikan, dpSudahMasuk, sisaTagihan, sudahLunas, type DasarPembayaranOrder } from "./status-jasa";

const jasa = (o: Partial<DasarPembayaranOrder>): DasarPembayaranOrder => ({ kategori: "Jasa", statusPembayaran: "Menunggu_Konfirmasi", totalHarga: 1_000_000, totalDibayar: 0, ...o });
const produk = (o: Partial<DasarPembayaranOrder>): DasarPembayaranOrder => ({ kategori: "Produk", statusPembayaran: "Belum_Bayar", totalHarga: 100_000, totalDibayar: 0, ...o });

describe("jasa dengan DP", () => {
    it("booking baru (belum ada uang masuk) → admin belum boleh mengelola", () => {
        expect(adminBolehMengelola(jasa({ totalDibayar: 0 }))).toBe(false);
    });
    it("DP sudah masuk → admin boleh memproses & mengerjakan, tapi belum boleh menyelesaikan", () => {
        const o = jasa({ totalDibayar: 300_000 });
        expect(dpSudahMasuk(o)).toBe(true);
        expect(adminBolehMengelola(o)).toBe(true);
        expect(bolehDiselesaikan(o)).toBe(false);
        expect(sisaTagihan(o)).toBe(700_000);
    });
    it("sudah lunas → boleh menyelesaikan", () => {
        const o = jasa({ statusPembayaran: "Lunas", totalDibayar: 1_000_000 });
        expect(sudahLunas(o)).toBe(true);
        expect(bolehDiselesaikan(o)).toBe(true);
        expect(dpSudahMasuk(o)).toBe(false);
        expect(sisaTagihan(o)).toBe(0);
    });
    it("total dibayar ≥ total harga dianggap lunas walau status belum diperbarui", () => {
        expect(sudahLunas(jasa({ totalDibayar: 1_000_000 }))).toBe(true);
    });
});

describe("produk", () => {
    it("tetap harus lunas sebelum dikelola", () => {
        expect(adminBolehMengelola(produk({ totalDibayar: 50_000 }))).toBe(false);
        expect(adminBolehMengelola(produk({ statusPembayaran: "Lunas", totalDibayar: 100_000 }))).toBe(true);
    });
});
