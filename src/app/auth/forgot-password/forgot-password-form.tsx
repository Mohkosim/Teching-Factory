"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { tampilkanLoading } from "@/lib/utils/alert";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/auth/FormField";
import {
  forgotPasswordSchema,
  type ForgotPasswordSchema,
} from "@/lib/validations/auth";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const sendRequest = async (email: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error("Gagal mengirim instruksi", {
        description: result.message ?? "Terjadi kesalahan, coba lagi.",
      });
      return false;
    }

    return true;
  };

  const onSubmit = async (data: ForgotPasswordSchema) => {
    tampilkanLoading("Mengirim instruksi...");
    try {
      const success = await sendRequest(data.email);
      Swal.close();
      if (!success) return;

      setSubmittedEmail(data.email);
      toast.success("Instruksi terkirim!", {
        description: "Silakan cek email Anda untuk melanjutkan.",
      });
    } catch (error) {
      Swal.close();
      console.error(error);
      toast.error("Terjadi kesalahan server");
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setIsResending(true);
    tampilkanLoading("Mengirim ulang...");
    try {
      const success = await sendRequest(submittedEmail);
      Swal.close();
      if (success) {
        toast.success("Email dikirim ulang!");
      }
    } catch (error) {
      Swal.close();
      console.error(error);
      toast.error("Terjadi kesalahan server");
    } finally {
      setIsResending(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="flex gap-4">
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
          <Mail className="w-6 h-6 text-green-600" />
        </div>

        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            E-mail Terkirim!
          </h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Kami telah mengirimkan email ke [{submittedEmail}]. Periksa
            kotak masuk Anda dan ikuti petunjuk untuk mengatur ulang kata
            sandi akun Anda.
          </p>

          <div className="mt-5 space-y-2 text-xs">
            <p className="text-gray-700 font-semibold">
              Apakah tidak menerima e-mail?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-bold text-sky-500 hover:text-sky-600 transition-colors disabled:opacity-60"
              >
                {isResending ? "Mengirim..." : "Kirim Ulang"}
              </button>
            </p>

            <p className="text-gray-700 font-semibold">
              Salah alamat e-mail?{" "}
              <button
                type="button"
                onClick={() => setSubmittedEmail(null)}
                className="font-bold text-sky-500 hover:text-sky-600 transition-colors"
              >
                Ubah Alamat E-mail
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Lupa Kata Sandi
        </h1>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          Masukkan alamat email yang Anda gunakan untuk membuat akun, dan
          kami akan mengirimkan instruksi
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6" noValidate>
        <FormField label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="Masukkan E-mail"
            className={`bg-sky-50 border-0 rounded-xl h-12 text-sm placeholder:text-gray-400 focus-visible:ring-sky-400 ${
              errors.email ? "ring-1 ring-red-400 focus-visible:ring-red-400" : ""
            }`}
            {...register("email")}
          />
        </FormField>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm shadow-sm transition-colors duration-200 mt-2 disabled:opacity-60"
        >
          {isSubmitting ? "Mengirim..." : "Kirim"}
        </Button>
      </form>

      <div className="text-center text-xs text-gray-500 mt-6">
        Ingat kata sandi?{" "}
        <Link href="/auth/login" className="font-bold text-sky-500 hover:text-sky-600 transition-colors">
          Masuk
        </Link>
      </div>
    </>
  );
}