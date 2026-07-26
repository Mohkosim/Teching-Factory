"use client"

import { useState, useRef } from "react"
import { User, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Profile() {
    const [profileForm, setProfileForm] = useState({
        nama: "",
        email: "",
    })

    const [passwordForm, setPasswordForm] = useState({
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
    })

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validasi tipe file
        if (!file.type.startsWith("image/")) {
            alert("File harus berupa gambar")
            return
        }

        // Validasi ukuran file (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("Ukuran file maksimal 2MB")
            return
        }

        setAvatarFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    // Satu handler untuk simpan semua perubahan (profil + password sekaligus)
    const handleSimpanPerubahan = () => {
        console.log("Update profile:", profileForm)
        console.log("Avatar file:", avatarFile)

        // Hanya proses password kalau user memang mengisi field password
        const isGantiPassword =
            passwordForm.passwordLama ||
            passwordForm.passwordBaru ||
            passwordForm.konfirmasiPassword

        if (isGantiPassword) {
            if (passwordForm.passwordBaru !== passwordForm.konfirmasiPassword) {
                alert("Konfirmasi password tidak sama dengan password baru")
                return
            }
            console.log("Update password:", passwordForm)
        }

        // Kirim ke API dengan FormData jika ada avatar baru
        // const formData = new FormData()
        // formData.append("nama", profileForm.nama)
        // formData.append("email", profileForm.email)
        // if (avatarFile) formData.append("avatar", avatarFile)
        // if (isGantiPassword) {
        //     formData.append("passwordLama", passwordForm.passwordLama)
        //     formData.append("passwordBaru", passwordForm.passwordBaru)
        // }
    }

    return (
        <div className="space-y-6 px-6">
            {/* Page Header */}
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

            {/* Card tunggal, section ditumpuk ke bawah */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Informasi Profil */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Informasi Profil
                    </h2>
                </div>

                <div className="p-6 space-y-5 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        {/* Avatar - Clickable */}
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                                )}
                            </div>

                            {/* Overlay saat hover */}
                            <div className="absolute inset-0 w-16 h-16 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <Camera className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        <div className="text-sm text-gray-500">
                            <p>Klik foto untuk mengganti</p>
                            <p className="text-gray-400">JPG, PNG. Maks 2MB.</p>
                        </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />

                    {/* Nama Field */}
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

                    {/* Email Field */}
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

                {/* Perbarui Kata Sandi */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Perbarui Kata Sandi
                    </h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Password Lama */}
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

                    {/* Password Baru */}
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

                    {/* Konfirmasi Password */}
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

                    {/* Satu tombol untuk simpan semua perubahan */}
                    <div className="flex justify-end pt-1">
                        <Button
                            onClick={handleSimpanPerubahan}
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 px-5 text-sm"
                        >
                            Simpan Perubahan
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}