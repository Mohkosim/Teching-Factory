import { z } from "zod";

export const produkSchema = z.object({
    nama_produk: z.string().min(1, "Nama produk wajib diisi"),
    deskripsi: z.string().optional(),
    harga: z.coerce.number().min(0, "Harga tidak boleh negatif"),
    status: z.enum(["Tersedia", "Habis", "Nonaktif"]),
    fotos: z.array(z.string().min(1)).min(1, "Minimal 1 foto produk"),
    stok: z.coerce.number().min(0, "Stok tidak boleh negatif"),
    kondisi: z.string().min(1, "Kondisi wajib diisi"),
});

export type ProdukForm = z.infer<typeof produkSchema>;