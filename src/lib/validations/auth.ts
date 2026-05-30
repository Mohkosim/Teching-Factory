import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail wajib diisi")
    .email("Format e-mail tidak valid"),
  password: z
    .string()
    .min(1, "Kata sandi wajib diisi")
    .min(8, "Kata sandi minimal 8 karakter"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(1, "Nama pengguna wajib diisi")
    .min(3, "Nama pengguna minimal 3 karakter")
    .max(30, "Nama pengguna maksimal 30 karakter")
    .regex(/^[a-zA-Z0-9_]+$/, "Hanya boleh huruf, angka, dan underscore"),
  email: z
    .string()
    .min(1, "E-mail wajib diisi")
    .email("Format e-mail tidak valid"),
  password: z
    .string()
    .min(1, "Kata sandi wajib diisi")
    .min(8, "Kata sandi minimal 8 karakter")
    .regex(/[A-Z]/, "Harus mengandung minimal 1 huruf kapital")
    .regex(/[0-9]/, "Harus mengandung minimal 1 angka"),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail wajib diisi")
    .email("Format e-mail tidak valid"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Kata sandi wajib diisi")
      .min(8, "Kata sandi minimal 8 karakter")
      .regex(/[A-Z]/, "Harus mengandung minimal 1 huruf kapital")
      .regex(/[0-9]/, "Harus mengandung minimal 1 angka"),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;