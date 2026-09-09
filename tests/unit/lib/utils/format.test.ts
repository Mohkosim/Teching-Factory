import { describe, it, expect } from "vitest";
import { formatAngka, formatRupiah, formatNominalInput } from "@/lib/utils/format";

describe("formatAngka", () => {
  it("memformat angka dengan pemisah ribuan gaya Indonesia", () => {
    expect(formatAngka(1000000)).toBe("1.000.000");
    expect(formatAngka(1500)).toBe("1.500");
  });

  it("menerima input berupa string angka", () => {
    expect(formatAngka("2500000")).toBe("2.500.000");
  });

  it("mengembalikan '0' jika input bukan angka yang valid", () => {
    expect(formatAngka("abc")).toBe("0");
  });

  it("menangani angka 0", () => {
    expect(formatAngka(0)).toBe("0");
  });
});

describe("formatRupiah", () => {
  it("menambahkan prefix 'Rp ' di depan angka terformat", () => {
    expect(formatRupiah(150000)).toBe("Rp 150.000");
  });

  it("tetap valid untuk input string", () => {
    expect(formatRupiah("315000")).toBe("Rp 315.000");
  });
});

describe("formatNominalInput", () => {
  it("membuang semua karakter non-digit dari input", () => {
    expect(formatNominalInput("Rp 100.000")).toBe("100.000");
  });

  it("mengembalikan string kosong jika tidak ada digit sama sekali", () => {
    expect(formatNominalInput("Rp -")).toBe("");
    expect(formatNominalInput("")).toBe("");
  });

  it("memformat input ketikan langsung (mis. dari form input nominal)", () => {
    expect(formatNominalInput("5000000")).toBe("5.000.000");
  });
});
