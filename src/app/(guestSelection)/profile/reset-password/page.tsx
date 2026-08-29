"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { updatePassword } from "@/lib/api/profile-api";
import type { ProfileData } from "@/types/interfaces/profile";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ResetPasswordPage() {
    const [loading, setLoading] = useState(true);
    const [nama, setNama] = useState("");
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const [passwordForm, setPasswordForm] = useState({
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
    });
    const [isPending, setIsPending] = useState(false);

    const [showPassword, setShowPassword] = useState({
        passwordLama: false,
        passwordBaru: false,
        konfirmasiPassword: false,
    });

    const toggleShowPassword = (field: keyof typeof showPassword) => {
        setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch("/api/profile");
                if (!res.ok) throw new Error("Gagal memuat profil");
                const data: ProfileData = await res.json();

                setNama(data.name ?? "");
                setAvatarPreview(data.img ?? null);
            } catch {
                toast.error("Gagal memuat data profil");
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, []);

    const handleSimpanPerubahan = async () => {
        const { passwordLama, passwordBaru, konfirmasiPassword } = passwordForm;

        if (!passwordLama || !passwordBaru || !konfirmasiPassword) {
            toast.error("Lengkapi semua field password");
            return;
        }

        if (passwordBaru.length < 6) {
            toast.error("Password baru minimal 6 karakter");
            return;
        }

        if (passwordBaru !== konfirmasiPassword) {
            toast.error("Konfirmasi password tidak sama dengan password baru");
            return;
        }

        setIsPending(true);
        tampilkanLoading("Mengubah password...");
        try {
            await updatePassword(passwordLama, passwordBaru);
            Swal.close();
            toast.success("Password berhasil diubah");
            setPasswordForm({ passwordLama: "", passwordBaru: "", konfirmasiPassword: "" });
        } catch (error) {
            Swal.close();
            let message = "Terjadi kesalahan saat menyimpan perubahan";
            if (error instanceof Error) {
                if (error.message === "WrongOldPassword") message = "Password lama salah";
                else message = error.message;
            }
            toast.error(message);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="min-h-screen py-6 px-4 md:px-8">
            {/* Breadcrumb */}
            <div className="max-w-6xl mx-auto flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Akun saya</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Ubah Password</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                <ProfileSidebar avatarPreview={avatarPreview} nama={nama} loading={loading} />

                {/* Main content */}
                <section className="bg-white rounded-2xl shadow-sm p-8">
                    <h1 className="text-2xl font-black text-gray-900">Ubah Password</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun
                    </p>

                    <div className="border-t border-gray-100 mt-4 pt-6">
                        {loading ? (
                            <div className="w-full space-y-5">
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                </div>
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                </div>
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                </div>
                                <div className="flex justify-end pt-1">
                                    <Skeleton className="h-9 w-36 rounded-lg" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full space-y-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="passwordLama" className="text-sm text-gray-600">
                                        Password lama
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="passwordLama"
                                            type={showPassword.passwordLama ? "text" : "password"}
                                            value={passwordForm.passwordLama}
                                            onChange={(e) =>
                                                setPasswordForm({ ...passwordForm, passwordLama: e.target.value })
                                            }
                                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleShowPassword("passwordLama")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            aria-label={showPassword.passwordLama ? "Sembunyikan password" : "Tampilkan password"}
                                            tabIndex={-1}
                                        >
                                            {showPassword.passwordLama ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="passwordBaru" className="text-sm text-gray-600">
                                        Password baru
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="passwordBaru"
                                            type={showPassword.passwordBaru ? "text" : "password"}
                                            value={passwordForm.passwordBaru}
                                            onChange={(e) =>
                                                setPasswordForm({ ...passwordForm, passwordBaru: e.target.value })
                                            }
                                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleShowPassword("passwordBaru")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            aria-label={showPassword.passwordBaru ? "Sembunyikan password" : "Tampilkan password"}
                                            tabIndex={-1}
                                        >
                                            {showPassword.passwordBaru ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="konfirmasiPassword" className="text-sm text-gray-600">
                                        Konfirmasi password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="konfirmasiPassword"
                                            type={showPassword.konfirmasiPassword ? "text" : "password"}
                                            value={passwordForm.konfirmasiPassword}
                                            onChange={(e) =>
                                                setPasswordForm({ ...passwordForm, konfirmasiPassword: e.target.value })
                                            }
                                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleShowPassword("konfirmasiPassword")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            aria-label={showPassword.konfirmasiPassword ? "Sembunyikan password" : "Tampilkan password"}
                                            tabIndex={-1}
                                        >
                                            {showPassword.konfirmasiPassword ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <Button
                                        onClick={handleSimpanPerubahan}
                                        disabled={isPending}
                                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 px-5 text-sm"
                                    >
                                        {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}