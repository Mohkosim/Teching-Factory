import { describe, it, expect } from "vitest";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("forgotPasswordSchema", () => {
  it("lolos validasi untuk email yang benar", () => {
    const result = forgotPasswordSchema.safeParse({ email: "user@gmail.com" });
    expect(result.success).toBe(true);
  });

  it("gagal jika email kosong", () => {
    const result = forgotPasswordSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("E-mail wajib diisi");
    }
  });

  it("gagal jika format email tidak valid", () => {
    const result = forgotPasswordSchema.safeParse({ email: "bukan-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Format e-mail tidak valid");
    }
  });
});

describe("resetPasswordSchema", () => {
  const payloadValid = {
    token: "token-valid",
    password: "PasswordBaru123",
    confirmPassword: "PasswordBaru123",
  };

  it("lolos validasi jika password & confirmPassword cocok", () => {
    const result = resetPasswordSchema.safeParse(payloadValid);
    expect(result.success).toBe(true);
  });

  it("gagal jika password kurang dari 8 karakter", () => {
    const result = resetPasswordSchema.safeParse({
      ...payloadValid,
      password: "123",
      confirmPassword: "123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Kata sandi minimal 8 karakter");
    }
  });

  it("gagal jika confirmPassword kosong", () => {
    const result = resetPasswordSchema.safeParse({
      ...payloadValid,
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Konfirmasi kata sandi wajib diisi");
    }
  });

  it("gagal jika password dan confirmPassword tidak sama", () => {
    const result = resetPasswordSchema.safeParse({
      ...payloadValid,
      confirmPassword: "PasswordLain123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Konfirmasi kata sandi tidak cocok");
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });
});