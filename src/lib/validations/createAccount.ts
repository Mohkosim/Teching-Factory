import { z } from "zod";
import { passwordKuat } from "./password";

export const addJurusanSchema = z.object({
    nama_jurusan: z.string().min(1, "Nama jurusan wajib diisi"),
    username: z.string().min(1, "Username wajib diisi"),
    email: z.string().email("Email tidak valid"),
    password: passwordKuat,
});

export type AddJurusanForm = z.infer<typeof addJurusanSchema>;