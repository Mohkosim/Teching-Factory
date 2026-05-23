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

export default function RegisterForm() {
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
            await new Promise((res) => setTimeout(res, 1000));

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
                <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="font-bold text-xl text-dark">
                    TEFA
                </span>
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