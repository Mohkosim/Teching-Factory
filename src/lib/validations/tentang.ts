import { z } from "zod";

export const tentangSchema = z.object({
  deskripsi: z.string().min(10, "Deskripsi minimal 10 karakter"),
  videoLink: z
    .string()
    .url("Link video tidak valid")
    .optional()
    .or(z.literal("")),
});

export type TentangInput = z.infer<typeof tentangSchema>;