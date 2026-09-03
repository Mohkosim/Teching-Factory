"use client";

import { useState, useRef, useTransition } from "react";
import { User, Camera } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { tampilkanLoading } from "@/lib/utils/alert";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { uploadAvatar, updateProfile, updatePassword } from "@/lib/api/profile-api";
import type { ProfileData } from "@/types/interfaces/profile";

export default function ProfileClient({ initialData }: { initialData: ProfileData }) {
    const { update } = useSession();
    const router = useRouter();

    const [profileForm, setProfileForm] = useState({
        nama: initialData.name,
        email: initialData.email,
    });

    const [passwordForm, setPasswordForm] = useState({
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
    });

    const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.img);
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();

    const [prevInitialData, setPrevInitialData] = useState(initialData);

    if (initialData !== prevInitialData) {
        setPrevInitialData(initialData);
        setProfileForm({
            nama: initialData.name,
            email: initialData.email,
        });
        setAvatarPreview(initialData.img);
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("File harus berupa gambar");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Ukuran file maksimal 2MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setAvatarPreview(result);
            setAvatarBase64(result);
        };
        reader.readAsDataURL(file);
    };

    const handleSimpanPerubahan = () => {
        const isGantiPassword =
            passwordForm.passwordLama ||
            passwordForm.passwordBaru ||
            passwordForm.konfirmasiPassword;

        if (isGantiPassword && passwordForm.passwordBaru !== passwordForm.konfirmasiPassword) {
            toast.error("Konfirmasi password tidak sama dengan password baru");
            return;
        }

        startTransition(async () => {
            tampilkanLoading("Menyimpan perubahan profil...");
            try {
                let imgUrl: string | undefined = undefined;

     
                if (avatarBase64 !== null) {
                    imgUrl = await uploadAvatar(avatarBase64);
                }

                await updateProfile({
                    name: profileForm.nama,
                    email: profileForm.email,
                    ...(imgUrl !== undefined ? { img: imgUrl } : {}),
                });

                if (isGantiPassword) {
                    await updatePassword(passwordForm.passwordLama, passwordForm.passwordBaru);
                    setPasswordForm({ passwordLama: "", passwordBaru: "", konfirmasiPassword: "" });
                }

                await update({
                    name: profileForm.nama,
                    email: profileForm.email,
                    ...(imgUrl !== undefined ? { image: imgUrl } : {}),
                });

                if (imgUrl) {
                    setAvatarPreview(imgUrl);
                    setAvatarBase64(null);
                }

                Swal.close();
                toast.success("Perubahan berhasil disimpan");
                router.refresh();
            } catch (err) {
                Swal.close();
                if (err instanceof Error) {
                    if (err.message === "WrongOldPassword") {
                        toast.error("Password lama salah");
                        return;
                    }
                    if (err.message === "EmailTaken") {
                        toast.error("Email sudah digunakan akun lain");
                        return;
                    }
                    if (err.message === "FileTooLarge") {
                        toast.error("Ukuran file terlalu besar");
                        return;
                    }
                }
                toast.error("Gagal menyimpan perubahan");
                console.error(err);
            }
        });
    };

    return (
        <div className="space-y-6 px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Profile
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Pengaturan</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Profile</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Informasi Profil
                    </h2>
                </div>

                <div className="p-6 space-y-5 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                                {avatarPreview ? (
                                    <Image
                                        src={avatarPreview}
                                        alt="Avatar"
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <User className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                                )}
                            </div>

                            <div className="absolute inset-0 w-16 h-16 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <Camera className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        <div className="text-sm text-gray-500">
                            <p>Klik foto untuk mengganti</p>
                            <p className="text-gray-400">JPG, PNG. Maks 2MB.</p>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />

                    <div className="space-y-1.5">
                        <Label htmlFor="nama" className="text-sm text-gray-600">
                            Nama
                        </Label>
                        <Input
                            id="nama"
                            type="text"
                            value={profileForm.nama}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, nama: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm text-gray-600">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={profileForm.email}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, email: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Perbarui Kata Sandi
                    </h2>
                </div>

                <div className="p-6 space-y-5">
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
        </div>
    );
}