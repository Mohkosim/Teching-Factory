"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import FormField from "@/components/auth/FormField";
import PasswordInput from "@/components/auth/PasswordInput";
import {
  resetPasswordSchema,
  type ResetPasswordSchema,
} from "@/lib/validations/auth";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: ResetPasswordSchema) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error("Gagal mengatur ulang kata sandi", {
          description: result.message ?? "Terjadi kesalahan, coba lagi.",
        });
        return;
      }

      setIsSuccess(true);
      toast.success("Kata sandi berhasil diubah!", {
        duration: 1500,
        onAutoClose: () => router.push("/auth/login"),
      });
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan server");
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Link Tidak Valid
        </h1>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          Link atur ulang kata sandi tidak ditemukan atau tidak valid.
          Silakan ajukan permintaan ulang.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-block mt-6 font-bold text-sky-500 hover:text-sky-600 transition-colors text-sm"
        >
          Kembali ke Lupa Kata Sandi
        </Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Atur Ulang Kata Sandi
        </h1>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          Kata sandi baru Anda harus berbeda dari kata sandi Anda
          sebelumnya
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6" noValidate>
        <input type="hidden" {...register("token")} />

        <FormField label="Kata Sandi Baru" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            placeholder="Masukkan Kata Sandi Baru"
            hasError={!!errors.password}
            disabled={isSuccess}
            {...register("password")}
          />
        </FormField>

        <FormField
          label="Konfirmasi Kata Sandi"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            placeholder="Masukkan Kembali Kata Sandi"
            hasError={!!errors.confirmPassword}
            disabled={isSuccess}
            {...register("confirmPassword")}
          />
        </FormField>

        <Button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className="w-full h-12 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm shadow-sm transition-colors duration-200 mt-2 disabled:opacity-60"
        >
          {isSubmitting ? "Memproses..." : isSuccess ? "Berhasil" : "Atur Ulang"}
        </Button>
      </form>
    </>
  );
}