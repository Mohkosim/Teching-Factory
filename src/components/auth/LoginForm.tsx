"use client";

import Link from "next/link";
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

export default function LoginForm() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginSchema) => {
        try {
            await new Promise((res) => setTimeout(res, 1000));

            const isSuccess = true;
            if (!isSuccess) throw new Error("Email atau kata sandi salah");

            toast.success("Berhasil masuk!", {
                description: "Selamat datang kembali.",
                duration: 1500,
                onAutoClose: () => {
                    router.push("/dashboard");
                }
            });

        } catch (err: any) {
            toast.error("Gagal masuk", {
                description: err.message ?? "Terjadi kesalahan, coba lagi.",
            });
        }
    };

    return (
        <>
            {/* Logo */}
            <div className="text-center">
                <span className="text-3xl font-black text-gray-900 tracking-tight">LOGO</span>
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

                {/* Lupa kata sandi */}
                <div className="flex justify-end">
                    <Link
                        href="/lupa-password"
                        className="text-xs text-sky-500 hover:text-sky-600 font-medium underline underline-offset-2"
                    >
                        Lupa kata sandi?
                    </Link>
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-semibold text-sm shadow-sm transition-colors duration-200 disabled:opacity-60"
                >
                    {isSubmitting ? "Memproses..." : "Masuk"}
                </Button>

                {/* Google */}
                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl border border-gray-200 text-sky-500 font-semibold text-sm hover:bg-sky-50 transition-colors duration-200 gap-2"
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                    </svg>
                    Masuk dengan Google
                </Button>
            </form>
        </>
    );
}