"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthTabs from "@/components/auth/AuthTabs";
import FormField from "@/components/auth/FormField";
import PasswordInput from "@/components/auth/PasswordInput";
import { registerSchema, type RegisterSchema } from "@/lib/validations/auth";

export default function Register() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterSchema>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterSchema) => {
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.message ?? "Terjadi kesalahan");
            }

            toast.success("Akun berhasil dibuat!", {
                description: "Silakan masuk menggunakan akun Anda.",
                duration: 1500,
                onAutoClose: () => {
                    router.push("/auth/login");
                },
            });
        } catch (err: any) {
            toast.error("Gagal membuat akun", {
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

                {/* Nama Pengguna */}
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

                {/* Tombol Buat Akun */}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm shadow-sm transition-colors duration-200 mt-2 disabled:opacity-60"
                >
                    {isSubmitting ? "Membuat akun..." : "Buat Akun"}
                </Button>

            </form>
        </>
    );
}