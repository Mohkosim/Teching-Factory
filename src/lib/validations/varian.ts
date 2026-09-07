import { z } from "zod";

export const varianOpsiSchema = z.object({
  nama: z.string().min(1, "Nama opsi wajib diisi"),
  gambar: z.string().optional(),
});

export const varianGrupSchema = z.object({
  nama: z.string().min(1, "Nama grup wajib diisi"),
  opsi: z.array(varianOpsiSchema).min(1, "Minimal 1 opsi per grup"),
});

export const varianKombinasiSchema = z.object({
  opsi_nama: z.array(z.string().min(1)),
  harga: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  stok: z.coerce.number().min(0, "Stok tidak boleh negatif"),
  sku: z.string().optional(),
  gambar: z.string().optional(),
});

export const simpanVarianSchema = z.object({
  grup: z.array(varianGrupSchema),
  kombinasi: z.array(varianKombinasiSchema),
});

export type VarianGrupForm = z.infer<typeof varianGrupSchema>;
export type VarianOpsiForm = z.infer<typeof varianOpsiSchema>;
export type VarianKombinasiForm = z.infer<typeof varianKombinasiSchema>;
export type SimpanVarianInput = z.infer<typeof simpanVarianSchema>;