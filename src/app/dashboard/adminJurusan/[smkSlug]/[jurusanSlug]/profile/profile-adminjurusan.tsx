"use client";

import { useState, useRef, useTransition } from "react";
import { User, Camera, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
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
import JamOperasionalField from "@/components/JamOperasionalField";

export default function ProfileClient({ initialData }: { initialData: ProfileData }) {
    const { update } = useSession();
    const router = useRouter();

    const [profileForm, setProfileForm] = useState({
        nama: initialData.name,
        email: initialData.email,
        phone: initialData.phone ?? "",
        deskripsi: initialData.deskripsi ?? "",
        kepala_jurusan: initialData.kepala_jurusan ?? "",
        jam_operasional: initialData.jam_operasional ?? "",
    });

    const [passwordForm, setPasswordForm] = useState({
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
    });

    const [showPasswordLama, setShowPasswordLama] = useState(false);
    const [showPasswordBaru, setShowPasswordBaru] = useState(false);
    const [showKonfirmasiPassword, setShowKonfirmasiPassword] = useState(false);

    const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.img);
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isProfilePending, startProfileTransition] = useTransition();
    const [isPasswordPending, startPasswordTransition] = useTransition();

    const [prevInitialData, setPrevInitialData] = useState(initialData);

    if (initialData !== prevInitialData) {
        setPrevInitialData(initialData);
        setProfileForm({
            nama: initialData.name,
            email: initialData.email,
            phone: initialData.phone ?? "",
            deskripsi: initialData.deskripsi ?? "",
            kepala_jurusan: initialData.kepala_jurusan ?? "",
            jam_operasional: initialData.jam_operasional ?? "",
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

    // ── Simpan Informasi Profil (tanpa menyentuh kata sandi) ──
    const handleSimpanProfil = () => {
        startProfileTransition(async () => {
            tampilkanLoading("Menyimpan perubahan...");
            try {
                let imgUrl: string | undefined;
                if (avatarBase64) {
                    imgUrl = await uploadAvatar(avatarBase64);
                }

                await updateProfile({
                    name: profileForm.nama,
                    email: profileForm.email,
                    phone: profileForm.phone,
                    deskripsi: profileForm.deskripsi,
                    kepala_jurusan: profileForm.kepala_jurusan,
                    jam_operasional: profileForm.jam_operasional,
                    ...(imgUrl !== undefined ? { img: imgUrl } : {}),
                });

                const updatedSession = await update({
                    name: profileForm.nama,
                    email: profileForm.email,
                    ...(imgUrl !== undefined ? { image: imgUrl } : {}),
                });

                if (imgUrl) {
                    setAvatarPreview(imgUrl);
                    setAvatarBase64(null);
                }

                Swal.close();
                toast.success("Profil berhasil disimpan");

                const newSmkSlug = updatedSession?.user?.smkSlug;
                const newJurusanSlug = updatedSession?.user?.jurusanSlug;

                if (newSmkSlug && newJurusanSlug) {
                    const segments = window.location.pathname.split("/");
                    segments[3] = newSmkSlug;
                    segments[4] = newJurusanSlug;
                    const newPath = segments.join("/");

                    if (newPath !== window.location.pathname) {
                        router.replace(newPath);
                        return;
                    }
                }

                router.refresh();
            } catch (err) {
                Swal.close();
                console.error(err);
                let message = "Terjadi kesalahan saat menyimpan profil";
                if (err instanceof Error) {
                    if (err.message === "EmailTaken") message = "Email sudah digunakan akun lain";
                    else if (err.message === "FileTooLarge") message = "Ukuran file terlalu besar";
                    else message = err.message;
                }
                toast.error(message);
            }
        });
    };

    // ── Ubah Kata Sandi (berdiri sendiri, tidak butuh field profil terisi) ──
    const handleSimpanPassword = () => {
        if (!passwordForm.passwordLama || !passwordForm.passwordBaru || !passwordForm.konfirmasiPassword) {
            toast.error("Lengkapi semua field password untuk mengganti kata sandi");
            return;
        }

        if (passwordForm.passwordBaru !== passwordForm.konfirmasiPassword) {
            toast.error("Konfirmasi password tidak sama dengan password baru");
            return;
        }

        startPasswordTransition(async () => {
            tampilkanLoading("Menyimpan kata sandi baru...");
            try {
                await updatePassword(passwordForm.passwordLama, passwordForm.passwordBaru);
                setPasswordForm({ passwordLama: "", passwordBaru: "", konfirmasiPassword: "" });
                Swal.close();
                toast.success("Kata sandi berhasil diubah");
            } catch (err) {
                Swal.close();
                console.error(err);
                let message = "Gagal mengubah kata sandi";
                if (err instanceof Error) {
                    if (err.message === "WrongOldPassword") message = "Password lama salah";
                    else message = err.message;
                }
                toast.error(message);
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

            {/* ── Card 1: Informasi Profil ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Informasi Profil
                    </h2>
                </div>

                <div className="p-6 space-y-5">
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
                        <Label htmlFor="nama" className="text-sm text-gray-600">Nama</Label>
                        <Input
                            id="nama"
                            type="text"
                            value={profileForm.nama}
                            onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm text-gray-600">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="deskripsi" className="text-sm text-gray-600">Deskripsi</Label>
                        <textarea
                            id="deskripsi"
                            value={profileForm.deskripsi}
                            onChange={(e) => setProfileForm({ ...profileForm, deskripsi: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg min-h-30 p-3 text-sm shadow-none resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="deskripsi jurusan"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm text-gray-600">Phone</Label>
                        <Input
                            id="phone"
                            type="text"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="phone"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="kepala_jurusan" className="text-sm text-gray-600">Kepala Jurusan</Label>
                        <Input
                            id="kepala_jurusan"
                            type="text"
                            value={profileForm.kepala_jurusan}
                            onChange={(e) => setProfileForm({ ...profileForm, kepala_jurusan: e.target.value })}
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="nama kepala jurusan"
                        />
                    </div>

                    <JamOperasionalField
                        value={profileForm.jam_operasional}
                        onChange={(value) => setProfileForm({ ...profileForm, jam_operasional: value })}
                    />

                    <div className="flex justify-end pt-1">
                        <Button
                            onClick={handleSimpanProfil}
                            disabled={isProfilePending}
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 px-5 text-sm"
                        >
                            {isProfilePending ? "Menyimpan..." : "Simpan Profil"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Card 2: Perbarui Kata Sandi (terpisah, tombol & validasi sendiri) ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                        <div className="relative">
                            <Input
                                id="passwordLama"
                                type={showPasswordLama ? "text" : "password"}
                                value={passwordForm.passwordLama}
                                onChange={(e) =>
                                    setPasswordForm({ ...passwordForm, passwordLama: e.target.value })
                                }
                                className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswordLama((prev) => !prev)}
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswordLama ? (
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
                                type={showPasswordBaru ? "text" : "password"}
                                value={passwordForm.passwordBaru}
                                onChange={(e) =>
                                    setPasswordForm({ ...passwordForm, passwordBaru: e.target.value })
                                }
                                className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswordBaru((prev) => !prev)}
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswordBaru ? (
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
                                type={showKonfirmasiPassword ? "text" : "password"}
                                value={passwordForm.konfirmasiPassword}
                                onChange={(e) =>
                                    setPasswordForm({ ...passwordForm, konfirmasiPassword: e.target.value })
                                }
                                className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKonfirmasiPassword((prev) => !prev)}
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showKonfirmasiPassword ? (
                                    <Eye className="w-4 h-4" />
                                ) : (
                                    <EyeOff className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-1">
                        <Button
                            onClick={handleSimpanPassword}
                            disabled={isPasswordPending}
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 px-5 text-sm"
                        >
                            {isPasswordPending ? "Menyimpan..." : "Ubah Kata Sandi"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}