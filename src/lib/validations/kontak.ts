import { z } from "zod";

export const kontakSchema = z.object({
  nama: z
    .string()
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z
    .string()
    .max(20, "Nomor HP maksimal 20 karakter")
    .optional()
    .or(z.literal("")),
  pesan: z
    .string()
    .min(10, "Pesan minimal 10 karakter")
    .max(1000, "Pesan maksimal 1000 karakter"),
});

export type KontakInput = z.infer<typeof kontakSchema>;