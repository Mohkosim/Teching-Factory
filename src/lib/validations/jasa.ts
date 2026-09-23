import { z } from "zod";

export const jasaSchema = z.object({
    nama_jasa: z.string().min(1, "Nama jasa wajib diisi"),
    deskripsi: z.string().optional(),
    harga: z.coerce.number().min(0, "Harga tidak boleh negatif"),
    status: z.enum(["Tersedia", "Habis", "Nonaktif"]),
    estimasi_pengerjaan: z.string().optional(),
    total_project: z.coerce.number().min(0).default(0),
    minimal_dp_persen: z.coerce.number().min(0, "Minimal DP tidak boleh negatif").max(100, "Minimal DP maksimal 100%").default(0),
    fotos: z.array(z.string()).min(1, "Minimal 1 foto jasa"),
    status_publikasi: z.enum(["Pending", "Published", "Revisi"]).optional(),
    portofolio: z
        .array(
            z.object({
                file_path: z.string(),
                deskripsi: z.string().nullable(),
            })
        )
        .optional(),
});

export type JasaForm = z.infer<typeof jasaSchema>;