import { z } from "zod";

/** Kebijakan kata sandi tunggal (sama dengan registrasi pelanggan). Dipakai juga untuk akun admin. */
export const passwordKuat = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .regex(/[A-Z]/, "Harus mengandung minimal 1 huruf kapital")
  .regex(/[0-9]/, "Harus mengandung minimal 1 angka");
