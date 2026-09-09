import { describe, it, expect } from "vitest";
import { loginSchema } from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("lolos validasi untuk email dan password yang benar", () => {
    const result = loginSchema.safeParse({
      email: "user@gmail.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("gagal jika email kosong", () => {
    const result = loginSchema.safeParse({ email: "", password: "password123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("E-mail wajib diisi");
    }
  });

  it("gagal jika format email tidak valid", () => {
    const result = loginSchema.safeParse({
      email: "bukan-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Format e-mail tidak valid");
    }
  });

  it("gagal jika password kurang dari 8 karakter", () => {
    const result = loginSchema.safeParse({
      email: "user@gmail.com",
      password: "123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Kata sandi minimal 8 karakter");
    }
  });

  it("gagal jika password kosong", () => {
    const result = loginSchema.safeParse({ email: "user@gmail.com", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Kata sandi wajib diisi");
    }
  });
});