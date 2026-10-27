import { describe, expect, it } from "vitest";
import { daftarBerbeda, statusPublikasiSetelahEdit, teksBerbeda } from "./validasi-ulang";

describe("statusPublikasiSetelahEdit", () => {
    it("mengembalikan Published ke Pending bila harga/informasi inti berubah", () => {
        expect(statusPublikasiSetelahEdit("Published", { berubah: true })).toBe("Pending");
    });

    it("membiarkan Published tetap Published bila hanya data operasional yang berubah", () => {
        expect(statusPublikasiSetelahEdit("Published", { berubah: false })).toBeUndefined();
    });

    it("mengajukan ulang produk berstatus Revisi apa pun perubahannya", () => {
        expect(statusPublikasiSetelahEdit("Revisi", { berubah: false })).toBe("Pending");
        expect(statusPublikasiSetelahEdit("Revisi", { berubah: true })).toBe("Pending");
    });

    it("tidak mengubah status Pending", () => {
        expect(statusPublikasiSetelahEdit("Pending", { berubah: true })).toBeUndefined();
    });
});

describe("daftarBerbeda", () => {
    it("tidak menganggap urutan berbeda sebagai perubahan", () => {
        expect(daftarBerbeda(["a", "b"], ["b", "a"])).toBe(false);
    });
    it("mendeteksi foto ditambah, dikurangi, atau diganti", () => {
        expect(daftarBerbeda(["a"], ["a", "b"])).toBe(true);
        expect(daftarBerbeda(["a", "b"], ["a"])).toBe(true);
        expect(daftarBerbeda(["a", "b"], ["a", "c"])).toBe(true);
    });
});

describe("teksBerbeda", () => {
    it("menganggap null, undefined, dan string kosong sebagai sama", () => {
        expect(teksBerbeda(null, "")).toBe(false);
        expect(teksBerbeda(undefined, null)).toBe(false);
    });
    it("mengabaikan spasi di tepi", () => {
        expect(teksBerbeda("Kue ", "Kue")).toBe(false);
    });
    it("mendeteksi teks yang benar-benar berubah", () => {
        expect(teksBerbeda("Kue", "Roti")).toBe(true);
    });
});
