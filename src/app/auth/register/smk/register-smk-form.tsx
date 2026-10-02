"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { tampilkanLoading } from "@/lib/utils/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/auth/FormField";
import PasswordInput from "@/components/auth/PasswordInput";
import { registerSmkSchema, type RegisterSmkSchema } from "@/lib/validations/pengajuan-mitra";
import Image from "next/image";

export default function RegisterSmkForm() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterSmkSchema>({
        resolver: zodResolver(registerSmkSchema),
    });

    const onSubmit = async (data: RegisterSmkSchema) => {
        tampilkanLoading("Mengirim pengajuan...");
        try {
            const res = await fetch("/api/auth/register/smk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const json = await res.json();
            Swal.close();

            if (!res.ok && !json.pendingVerification) {
                throw new Error(json.message ?? "Terjadi kesalahan");
            }

            const emailBelumTerkirim = !res.ok;
            const pergiKeVerifikasi = () => {
                router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}`);
            };

            if (emailBelumTerkirim) {
                toast.warning("Akun & pengajuan dibuat, tapi email belum terkirim", {
                    description: json.message,
                    duration: 2500,
                    onAutoClose: pergiKeVerifikasi,
                });
            } else {
                toast.success("Pengajuan berhasil dikirim!", {
                    description: "Silakan cek email Anda untuk kode verifikasi (cek juga folder Spam).",
                    duration: 1500,
                    onAutoClose: pergiKeVerifikasi,
                });
            }
        } catch (err) {
            Swal.close();
            const errormassage = err instanceof Error ? err.message : "Terjadi kesalahan";
            toast.error("Gagal mengirim pengajuan", {
                description: errormassage,
            });
        }
    };

    return (
        <>
            <div className="text-center w-full">
                <span className="text-3xl font-black text-gray-900 tracking-tight block">
                    <Image
                        src="/img/LogoTefa.png"
                        alt="Logo Tefa"
                        width={150}
                        height={80}
                        className="object-contain w-auto h-auto mx-auto block"
                        priority
                    />
                </span>
            </div>

            <div className="text-center">
                <h1 className="text-lg font-bold text-gray-900">Daftar sebagai SMK / Mitra</h1>
                <p className="text-xs text-gray-500 mt-1">
                    Lengkapi data di bawah ini. Pengajuan akan diteruskan ke SuperAdmin
                    setelah e-mail Anda terverifikasi.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                <FormField label="Nama Pengguna" htmlFor="username" error={errors.username?.message}>
                    <Input
                        id="username"
                        type="text"
                        placeholder="Masukkan Nama Pengguna"
                        className={`bg-sky-50 border-0 rounded-xl h-12 text-sm placeholder:text-gray-400 focus-visible:ring-sky-400 ${errors.username ? "ring-1 ring-red-400 focus-visible:ring-red-400" : ""
                            }`}
                        {...register("username")}
                    />
                </FormField>

                <FormField label="E-mail" htmlFor="email" error={errors.email?.message}>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Masukkan E-mail"
                        className={`bg-sky-50 border-0 rounded-xl h-12 text-sm placeholder:text-gray-400 focus-visible:ring-sky-400 ${errors.email ? "ring-1 ring-red-400 focus-visible:ring-red-400" : ""
                            }`}
                        {...register("email")}
                    />
                </FormField>

                <FormField label="Kata Sandi" htmlFor="password" error={errors.password?.message}>
                    <PasswordInput
                        id="password"
                        hasError={!!errors.password}
                        {...register("password")}
                    />
                </FormField>

                <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Data Sekolah &amp; Penanggung Jawab
                    </p>
                </div>

                <FormField label="Nama Sekolah" htmlFor="namaSekolah" error={errors.namaSekolah?.message}>
                    <Input
                        id="namaSekolah"
                        type="text"
                        placeholder="Contoh: SMK Negeri 1 Klaten"
                        className={`bg-sky-50 border-0 rounded-xl h-12 text-sm placeholder:text-gray-400 focus-visible:ring-sky-400 ${errors.namaSekolah ? "ring-1 ring-red-400 focus-visible:ring-red-400" : ""
                            }`}
                        {...register("namaSekolah")}
                    />
                </FormField>

                <FormField label="NPSN" htmlFor="npsn" error={errors.npsn?.message}>
                    <Input
                        id="npsn"
                        type="text"
                        inputMode="numeric"
                        placeholder="8 digit NPSN sekolah"
                        className={`bg-sky-50 border-0 rounded-xl h-12 text-sm placeholder:text-gray-400 focus-visible:ring-sky-400 ${errors.npsn ? "ring-1 ring-red-400 focus-visible:ring-red-400" : ""
                            }`}
                        {...register("npsn")}
                    />
                </FormField>

                <FormField label="Nama Penanggung Jawab" htmlFor="namaPenanggungJawab" error={errors.namaPenanggungJawab?.message}>
                    <Input
                        id="namaPenanggungJawab"
                        type="text"
                        placeholder="Nama yang bertanggung jawab atas akun ini"
                        className={`bg-sky-50 border-0 rounded-xl h-12 text-sm placeholder:text-gray-400 focus-visible:ring-sky-400 ${errors.namaPenanggungJawab ? "ring-1 ring-red-400 focus-visible:ring-red-400" : ""
                            }`}
                        {...register("namaPenanggungJawab")}
                    />
                </FormField>

                <FormField label="No. HP Penanggung Jawab" htmlFor="noHpPenanggungJawab" error={errors.noHpPenanggungJawab?.message}>
                    <Input
                        id="noHpPenanggungJawab"
                        type="tel"
                        inputMode="numeric"
                        placeholder="Contoh: 081234567890"
                        className={`bg-sky-50 border-0 rounded-xl h-12 text-sm placeholder:text-gray-400 focus-visible:ring-sky-400 ${errors.noHpPenanggungJawab ? "ring-1 ring-red-400 focus-visible:ring-red-400" : ""
                            }`}
                        {...register("noHpPenanggungJawab")}
                    />
                </FormField>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm shadow-sm transition-colors duration-200 mt-2 disabled:opacity-60"
                >
                    {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
                </Button>

                <p className="text-center text-xs text-gray-500">
                    Daftar sebagai pengguna{" "}
                    <Link href="/auth/register" className="font-semibold text-sky-500 hover:underline">
                        Daftar User
                    </Link>
                </p>

            </form>
        </>
    );
}
