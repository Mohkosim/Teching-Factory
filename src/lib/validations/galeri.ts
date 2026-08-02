import { z } from "zod";

export const galeriSchema = z.object({
    judul: z.string().min(1, "Judul wajib diisi"),
    deskripsi: z.string().optional(),
    kategori: z.enum(["Pameran", "Lomba", "Pelatihan", "Kunjungan"]),
    image: z.string().min(1, "Gambar wajib diunggah"),
});

export type GaleriForm = z.infer<typeof galeriSchema>;