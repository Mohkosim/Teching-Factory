"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfileSidebar from "@/components/profile/ProfileSidebar";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ProfilePage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const [passwordForm, setPasswordForm] = useState({
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
    });
    const [isPending, setIsPending] = useState(false);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSimpanPerubahan = () => {
        // TODO: sambungkan ke API ubah password, masih tampilan saja
        setIsPending(true);
        setTimeout(() => {
            setIsPending(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 md:px-8">
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
                <ProfileSidebar avatarPreview={avatarPreview} onAvatarClick={handleAvatarClick} />

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                />

                {/* Main content */}
                <section className="bg-white rounded-2xl shadow-sm p-8">
                    <h1 className="text-2xl font-black text-gray-900">Ubah Password</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun
                    </p>

                    <div className="border-t border-gray-100 mt-4 pt-6">
                        <div className="w-full space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="passwordLama" className="text-sm text-gray-600">
                                    Password lama
                                </Label>
                                <Input
                                    id="passwordLama"
                                    type="password"
                                    value={passwordForm.passwordLama}
                                    onChange={(e) =>
                                        setPasswordForm({ ...passwordForm, passwordLama: e.target.value })
                                    }
                                    className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="passwordBaru" className="text-sm text-gray-600">
                                    Password baru
                                </Label>
                                <Input
                                    id="passwordBaru"
                                    type="password"
                                    value={passwordForm.passwordBaru}
                                    onChange={(e) =>
                                        setPasswordForm({ ...passwordForm, passwordBaru: e.target.value })
                                    }
                                    className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="konfirmasiPassword" className="text-sm text-gray-600">
                                    Konfirmasi password
                                </Label>
                                <Input
                                    id="konfirmasiPassword"
                                    type="password"
                                    value={passwordForm.konfirmasiPassword}
                                    onChange={(e) =>
                                        setPasswordForm({ ...passwordForm, konfirmasiPassword: e.target.value })
                                    }
                                    className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                                />
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
                    </div>
                </section>
            </div>
        </div>
    );
}