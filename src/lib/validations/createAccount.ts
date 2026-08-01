import { z } from "zod";

export const addJurusanSchema = z.object({
    nama_jurusan: z.string().min(1, "Nama jurusan wajib diisi"),
    username: z.string().min(1, "Username wajib diisi"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
});

export type AddJurusanForm = z.infer<typeof addJurusanSchema>;