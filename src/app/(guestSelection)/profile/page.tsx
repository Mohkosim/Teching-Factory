"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FaUserCircle, FaCamera } from "react-icons/fa";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Data dummy sementara untuk preview tampilan.
// Nanti diganti fetch data user asli dari session/API.
const DUMMY_PROFILE = {
    username: "budi.santoso",
    nama: "Budi Santoso",
    email: "budi.santoso@gmail.com",
    telepon: "081234567890",
    gender: "laki-laki",
};

export default function ProfilePage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarPreview(URL.createObjectURL(file));
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
                            <BreadcrumbPage>Profil</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                <ProfileSidebar avatarPreview={avatarPreview} onAvatarClick={handleAvatarClick} />

                {/* Main content */}
                <section className="bg-white rounded-2xl shadow-sm p-8">
                    <h1 className="text-2xl font-black text-gray-900">Profil Saya</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Kelola informasi profil Anda untuk mengontrol, melindungi dan mengamankan akun
                    </p>

                    <div className="border-t border-gray-100 mt-4 pt-6">
                        {/* Form fields */}
                        <form className="space-y-4 w-full">
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
                                            <FaUserCircle className="w-full h-full text-gray-300" />
                                        )}
                                    </div>

                                    <div className="absolute inset-0 w-16 h-16 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                        <FaCamera className="w-4 h-4 text-white" />
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="username" className="text-sm text-gray-700">Username</Label>
                                    <Input
                                        id="username"
                                        defaultValue={DUMMY_PROFILE.username}
                                        className="rounded-lg border-gray-200 h-10"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="nama" className="text-sm text-gray-700">Nama</Label>
                                    <Input
                                        id="nama"
                                        defaultValue={DUMMY_PROFILE.nama}
                                        className="rounded-lg border-gray-200 h-10"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-sm text-gray-700">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        defaultValue={DUMMY_PROFILE.email}
                                        className="rounded-lg border-gray-200 h-10"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="telepon" className="text-sm text-gray-700">Nomor Telepon</Label>
                                    <Input
                                        id="telepon"
                                        type="tel"
                                        defaultValue={DUMMY_PROFILE.telepon}
                                        className="rounded-lg border-gray-200 h-10"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="gender" className="text-sm text-gray-700">Jenis Kelamin</Label>
                                    <Select defaultValue={DUMMY_PROFILE.gender}>
                                        <SelectTrigger id="gender" className="rounded-lg border-gray-200 h-10 w-full">
                                            <SelectValue placeholder="Pilih jenis kelamin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="laki-laki">Laki-laki</SelectItem>
                                            <SelectItem value="perempuan">Perempuan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    className="rounded-lg bg-sky-400 hover:bg-sky-500 text-white font-bold px-6 h-10"
                                >
                                    Simpan
                                </Button>
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
}