import { z } from "zod";
import { registerSchema } from "@/lib/validations/auth";

export const pengajuanMitraSchema = z.object({
    namaSekolah: z
        .string()
        .trim()
        .min(1, "Nama sekolah wajib diisi")
        .min(5, "Nama sekolah minimal 5 karakter")
        .max(150, "Nama sekolah maksimal 150 karakter"),
    npsn: z
        .string()
        .trim()
        .length(8, "NPSN harus 8 digit")
        .regex(/^\d{8}$/, "NPSN hanya boleh berisi angka"),
    namaPenanggungJawab: z
        .string()
        .trim()
        .min(1, "Nama penanggung jawab wajib diisi")
        .min(3, "Nama penanggung jawab minimal 3 karakter")
        .max(100, "Nama penanggung jawab maksimal 100 karakter"),
    noHpPenanggungJawab: z
        .string()
        .trim()
        .regex(/^08\d{8,11}$/, "Nomor HP tidak valid (contoh: 081234567890)"),
});

export type PengajuanMitraSchema = z.infer<typeof pengajuanMitraSchema>;

export const registerSmkSchema = registerSchema.merge(pengajuanMitraSchema);
export type RegisterSmkSchema = z.infer<typeof registerSmkSchema>;

export const prosesPengajuanMitraSchema = z.object({
    action: z.enum(["approve", "reject"]),
    catatanAdmin: z.string().trim().max(500).optional(),
});

export type ProsesPengajuanMitraSchema = z.infer<typeof prosesPengajuanMitraSchema>;
