import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/validations/auth";

const payloadValid = {
  username: "budi_santoso",
  email: "budi@example.com",
  password: "Rahasia123",
};

describe("registerSchema", () => {
  it("lolos validasi untuk data registrasi yang benar", () => {
    expect(registerSchema.safeParse(payloadValid).success).toBe(true);
  });

  it("gagal jika username mengandung karakter selain huruf/angka/underscore", () => {
    const result = registerSchema.safeParse({ ...payloadValid, username: "budi santoso!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hanya boleh huruf, angka, dan underscore");
    }
  });

  it("gagal jika username kurang dari 3 karakter", () => {
    const result = registerSchema.safeParse({ ...payloadValid, username: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nama pengguna minimal 3 karakter");
    }
  });

  it("gagal jika password tidak mengandung huruf kapital", () => {
    const result = registerSchema.safeParse({ ...payloadValid, password: "rahasia123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Harus mengandung minimal 1 huruf kapital");
    }
  });

  it("gagal jika password tidak mengandung angka", () => {
    const result = registerSchema.safeParse({ ...payloadValid, password: "RahasiaSaja" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Harus mengandung minimal 1 angka");
    }
  });

  it("gagal jika password kurang dari 8 karakter meski sudah ada kapital & angka", () => {
    const result = registerSchema.safeParse({ ...payloadValid, password: "Ra1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Kata sandi minimal 8 karakter");
    }
  });
});
