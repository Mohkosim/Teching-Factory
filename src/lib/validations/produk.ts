import { z } from "zod";

export const produkSchema = z.object({
    nama_produk: z.string().min(1, "Nama produk wajib diisi"),
    deskripsi: z.string().optional(),
    harga: z.coerce.number().min(0, "Harga tidak boleh negatif"),
    status: z.enum(["Tersedia", "Habis", "Nonaktif"]),
    fotos: z.array(z.string().min(1)).min(1, "Minimal 1 foto produk"),
    stok: z.coerce.number().min(0, "Stok tidak boleh negatif"),
    kondisi: z.string().min(1, "Kondisi wajib diisi"),
    berat_gram: z.coerce.number().int("Berat harus bilangan bulat").min(1, "Berat minimal 1 gram").max(100000, "Berat maksimal 100.000 gram").optional(),
    status_publikasi: z.enum(["Pending", "Published", "Revisi"]).optional(),
});

export type ProdukForm = z.infer<typeof produkSchema>;