import { describe, it, expect } from "vitest";
import { computeStatusProduk } from "@/lib/utils/status-produk";

describe("computeStatusProduk (status produk otomatis dari stok)", () => {
  it("stok > 0 dan status diminta 'Tersedia' -> tetap 'Tersedia'", () => {
    expect(computeStatusProduk(5, "Tersedia")).toBe("Tersedia");
  });

  it("stok 0 -> otomatis 'Habis', walau diminta 'Tersedia'", () => {
    expect(computeStatusProduk(0, "Tersedia")).toBe("Habis");
  });

  it("stok negatif (data tidak wajar) diperlakukan sama seperti stok habis", () => {
    expect(computeStatusProduk(-1, "Tersedia")).toBe("Habis");
  });

  it("stok > 0 tetapi diminta 'Habis' -> tetap mengikuti permintaan ('Habis')", () => {
    expect(computeStatusProduk(10, "Habis")).toBe("Habis");
  });

  it("'Nonaktif' selalu menang: tetap 'Nonaktif' baik stok 0 maupun > 0", () => {
    expect(computeStatusProduk(0, "Nonaktif")).toBe("Nonaktif");
    expect(computeStatusProduk(10, "Nonaktif")).toBe("Nonaktif");
  });
});
