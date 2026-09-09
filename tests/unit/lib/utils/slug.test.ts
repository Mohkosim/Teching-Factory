import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/utils/slug";

describe("slugify", () => {
  it("mengubah huruf besar menjadi huruf kecil", () => {
    expect(slugify("Kerajinan Kulit")).toBe("kerajinan-kulit");
  });

  it("mengganti spasi dengan tanda strip", () => {
    expect(slugify("Produk Unggulan Jurusan")).toBe("produk-unggulan-jurusan");
  });

  it("menghapus karakter selain huruf, angka, spasi, dan strip", () => {
    expect(slugify("Kue Kering & Snack!!")).toBe("kue-kering-snack");
  });

  it("menghapus spasi di awal/akhir sebelum diproses", () => {
    expect(slugify("  Tas Rajut  ")).toBe("tas-rajut");
  });

  it("menggabungkan beberapa strip berurutan menjadi satu", () => {
    expect(slugify("Jasa   Servis -- Elektronik")).toBe("jasa-servis-elektronik");
  });

  it("mempertahankan angka", () => {
    expect(slugify("Paket Hemat 2026")).toBe("paket-hemat-2026");
  });

  it("mengembalikan string kosong untuk input kosong", () => {
    expect(slugify("")).toBe("");
  });
});
