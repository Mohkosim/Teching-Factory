"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthTabs from "@/components/auth/AuthTabs";
import FormField from "@/components/auth/FormField";
import PasswordInput from "@/components/auth/PasswordInput";
import { loginSchema, type LoginSchema } from "@/lib/validations/auth";
import Image from "next/image";
import Link from "next/link";

// Peta redirect berdasarkan role
const ROLE_REDIRECT: Record<string, string> = {
  SuperAdmin: "/dashboard/superAdmin",
  AdminSMK: "/dashboard/adminSMK",
  AdminJurusan: "/dashboard/adminJurusan",
  User: "/",
};

export default function Login() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchema) => {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "AccountDisabled") {
        toast.error("Akun dinonaktifkan", {
          description: "Akun Anda sedang dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.",
        });
      } else {
        toast.error("Login gagal", {
          description: "E-mail atau kata sandi salah.",
        });
      }
      return;
    }

    // Ambil session untuk baca role
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role: string = session?.user?.role ?? "User";

    toast.success("Berhasil masuk!", {
      duration: 1200,
      onAutoClose: () => {
        router.push(ROLE_REDIRECT[role] ?? "/dashboard");
      },
    });
  };

  const handleGoogleSignIn = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <>
      {/* Logo */}
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

      {/* Tabs */}
      <AuthTabs />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* E-mail */}
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

        {/* Kata Sandi */}
        <FormField label="Kata Sandi" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            hasError={!!errors.password}
            {...register("password")}
          />
        </FormField>

        {/* Lupa Kata Sandi */}
        <div className="flex justify-end -mt-3">
          <Link
            href="/auth/forgot-password"
            className="text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors"
          >
            Lupa Kata Sandi?
          </Link>
        </div>

        {/* Tombol Masuk */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm shadow-sm transition-colors duration-200 mt-2 disabled:opacity-60"
        >
          {isSubmitting ? "Memproses..." : "Masuk"}
        </Button>

        {/* Tombol Masuk dengan Google */}
        <Button
          type="button"
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full h-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm shadow-sm transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Image
            src="/img/google.svg"
            alt="Google"
            width={18}
            height={18}
          />
          Masuk dengan Google
        </Button>

      </form>
    </>
  );
}