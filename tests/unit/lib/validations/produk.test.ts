import { describe, it, expect } from "vitest";
import { produkSchema } from "@/lib/validations/produk";

const dataValid = {
  nama_produk: "Kursi Kayu Jati",
  deskripsi: "Kursi kayu jati buatan siswa jurusan DKV",
  harga: 250000,
  status: "Tersedia" as const,
  fotos: ["https://res.cloudinary.com/foto1.jpg"],
  stok: 10,
  kondisi: "Baru",
};

describe("produkSchema", () => {
  it("menerima data produk yang lengkap dan valid", () => {
    expect(produkSchema.safeParse(dataValid).success).toBe(true);
  });

  it("menolak jika nama_produk kosong", () => {
    const result = produkSchema.safeParse({ ...dataValid, nama_produk: "" });
    expect(result.success).toBe(false);
  });

  it("menolak harga negatif", () => {
    const result = produkSchema.safeParse({ ...dataValid, harga: -1000 });
    expect(result.success).toBe(false);
  });

  it("menolak stok negatif", () => {
    const result = produkSchema.safeParse({ ...dataValid, stok: -1 });
    expect(result.success).toBe(false);
  });

  it("menolak jika tidak ada foto sama sekali", () => {
    const result = produkSchema.safeParse({ ...dataValid, fotos: [] });
    expect(result.success).toBe(false);
  });

  it("menolak status di luar enum yang diperbolehkan", () => {
    const result = produkSchema.safeParse({ ...dataValid, status: "Draft" });
    expect(result.success).toBe(false);
  });

  it("mengizinkan deskripsi tidak diisi (opsional)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deskripsi, ...tanpaDeskripsi } = dataValid;
    expect(produkSchema.safeParse(tanpaDeskripsi).success).toBe(true);
  });

  it("meng-coerce harga dan stok bertipe string menjadi number", () => {
    const result = produkSchema.safeParse({ ...dataValid, harga: "250000", stok: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.harga).toBe(250000);
      expect(result.data.stok).toBe(10);
    }
  });

  it("menolak jika kondisi kosong", () => {
    const result = produkSchema.safeParse({ ...dataValid, kondisi: "" });
    expect(result.success).toBe(false);
  });
});
