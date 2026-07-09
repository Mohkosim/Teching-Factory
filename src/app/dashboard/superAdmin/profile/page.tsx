"use client"

import { useState, useRef } from "react"
import { User, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
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

    const handleUpdateProfile = () => {
        console.log("Update profile:", profileForm)
        console.log("Avatar file:", avatarFile)
        // Kirim ke API dengan FormData jika ada avatar baru
        // const formData = new FormData()
        // formData.append("nama", profileForm.nama)
        // formData.append("email", profileForm.email)
        // if (avatarFile) formData.append("avatar", avatarFile)
    }

    const handleUpdatePassword = () => {
        console.log("Update password:", passwordForm)
    }

    return (
        <div className="space-y-6 px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Profile
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Profile</BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Cards Container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informasi Profil Card */}
                <Card className="bg-white rounded-2xl shadow-sm border-0">
                    <CardHeader className="pb-2 pt-8">
                        <CardTitle className="text-center text-lg font-bold text-gray-800">
                            Informasi Profil
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-5 pb-8 px-10">
                        {/* Avatar - Clickable */}
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <div className="w-24 h-24 rounded-full border-[3px] border-gray-800 flex items-center justify-center bg-white overflow-hidden">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-14 h-14 text-gray-800" strokeWidth={1.5} />
                                )}
                            </div>

                            {/* Overlay kamera saat hover */}
                            <div className="absolute inset-0 w-24 h-24 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Camera className="w-6 h-6 text-white" />
                            </div>

                            {/* Badge kamera kecil di pojok */}
                            <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#1DA1F2] rounded-full flex items-center justify-center border-2 border-white">
                                <Camera className="w-3.5 h-3.5 text-white" />
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
                        <div className="w-full space-y-1.5">
                            <Label htmlFor="nama" className="text-sm font-medium text-gray-700">
                                Nama
                            </Label>
                            <Input
                                id="nama"
                                type="text"
                                value={profileForm.nama}
                                onChange={(e) =>
                                    setProfileForm({ ...profileForm, nama: e.target.value })
                                }
                                className="bg-[#EAF4FB] border-0 rounded-md h-10 focus-visible:ring-1 focus-visible:ring-blue-400"
                            />
                        </div>

                        {/* Email Field */}
                        <div className="w-full space-y-1.5">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={profileForm.email}
                                onChange={(e) =>
                                    setProfileForm({ ...profileForm, email: e.target.value })
                                }
                                className="bg-[#EAF4FB] border-0 rounded-md h-10 focus-visible:ring-1 focus-visible:ring-blue-400"
                            />
                        </div>

                        {/* Update Profile Button */}
                        <Button
                            onClick={handleUpdateProfile}
                            className="bg-[#1DA1F2] hover:bg-[#1a8fd1] text-white rounded-lg px-6 h-10 font-medium mt-2"
                        >
                            Update Profile
                        </Button>
                    </CardContent>
                </Card>

                {/* Perbarui Kata Sandi Card */}
                <Card className="bg-white rounded-2xl shadow-sm border-0">
                    <CardHeader className="pb-2 pt-8">
                        <CardTitle className="text-lg font-bold text-gray-800">
                            Perbarui Kata Sandi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5 pb-8 px-8">
                        {/* Password Lama */}
                        <div className="space-y-1.5">
                            <Label htmlFor="passwordLama" className="text-sm font-medium text-gray-700">
                                Password lama
                            </Label>
                            <Input
                                id="passwordLama"
                                type="password"
                                value={passwordForm.passwordLama}
                                onChange={(e) =>
                                    setPasswordForm({ ...passwordForm, passwordLama: e.target.value })
                                }
                                className="bg-[#EAF4FB] border-0 rounded-md h-10 focus-visible:ring-1 focus-visible:ring-blue-400"
                            />
                        </div>

                        {/* Password Baru */}
                        <div className="space-y-1.5">
                            <Label htmlFor="passwordBaru" className="text-sm font-medium text-gray-700">
                                Password baru
                            </Label>
                            <Input
                                id="passwordBaru"
                                type="password"
                                value={passwordForm.passwordBaru}
                                onChange={(e) =>
                                    setPasswordForm({ ...passwordForm, passwordBaru: e.target.value })
                                }
                                className="bg-[#EAF4FB] border-0 rounded-md h-10 focus-visible:ring-1 focus-visible:ring-blue-400"
                            />
                        </div>

                        {/* Konfirmasi Password */}
                        <div className="space-y-1.5">
                            <Label htmlFor="konfirmasiPassword" className="text-sm font-medium text-gray-700">
                                Konfirmasi password
                            </Label>
                            <Input
                                id="konfirmasiPassword"
                                type="password"
                                value={passwordForm.konfirmasiPassword}
                                onChange={(e) =>
                                    setPasswordForm({ ...passwordForm, konfirmasiPassword: e.target.value })
                                }
                                className="bg-[#EAF4FB] border-0 rounded-md h-10 focus-visible:ring-1 focus-visible:ring-blue-400"
                            />
                        </div>

                        {/* Update Password Button */}
                        <div className="mt-2">
                            <Button
                                onClick={handleUpdatePassword}
                                className="bg-[#1DA1F2] hover:bg-[#1a8fd1] text-white rounded-lg px-6 h-10 font-medium"
                            >
                                Update Password
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}