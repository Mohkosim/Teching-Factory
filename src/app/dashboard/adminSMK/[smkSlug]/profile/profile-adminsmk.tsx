"use client";

import { useState, useRef, useTransition } from "react";
import { User, Camera } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
        phone: initialData.phone ?? "",
        kepala_sekolah: initialData.kepala_sekolah ?? "",
        deskripsi_smk: initialData.deskripsi_smk ?? "",
        alamat: initialData.alamat ?? "",
        kota: initialData.kota ?? "",
        provinsi: initialData.provinsi ?? "",
        map_link: initialData.map_link ?? "",
        tahun_berdiri: initialData.tahun_berdiri ? String(initialData.tahun_berdiri) : "",
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
            phone: initialData.phone ?? "",
            kepala_sekolah: initialData.kepala_sekolah ?? "",
            deskripsi_smk: initialData.deskripsi_smk ?? "",
            alamat: initialData.alamat ?? "",
            kota: initialData.kota ?? "",
            provinsi: initialData.provinsi ?? "",
            map_link: initialData.map_link ?? "",
            tahun_berdiri: initialData.tahun_berdiri ? String(initialData.tahun_berdiri) : "",
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

        if (isGantiPassword && (!passwordForm.passwordLama || !passwordForm.passwordBaru)) {
            toast.error("Lengkapi semua field password untuk mengganti kata sandi");
            return;
        }

        if (!profileForm.alamat || !profileForm.kota || !profileForm.provinsi || !profileForm.tahun_berdiri) {
            toast.error("Alamat, kota, provinsi, dan tahun berdiri wajib diisi");
            return;
        }

        if (profileForm.map_link && !profileForm.map_link.includes("google.com/maps/embed")) {
            toast.error("Link peta harus berupa link embed Google Maps (Bagikan → Sematkan peta)");
            return;
        }

        startTransition(async () => {
            try {
                // 1. Upload avatar dulu (kalau ada foto baru) untuk dapat URL-nya
                let imgUrl: string | undefined;
                if (avatarBase64) {
                    imgUrl = await uploadAvatar(avatarBase64);
                }

                // 2. Update profil pakai URL avatar (bukan base64)
                const updated = await updateProfile({
                    name: profileForm.nama,
                    email: profileForm.email,
                    img: imgUrl,
                    phone: profileForm.phone,
                    kepala_sekolah: profileForm.kepala_sekolah,
                    deskripsi_smk: profileForm.deskripsi_smk,
                    alamat: profileForm.alamat,
                    kota: profileForm.kota,
                    provinsi: profileForm.provinsi,
                    map_link: profileForm.map_link,
                    tahun_berdiri: Number(profileForm.tahun_berdiri),
                });

                // 3. Update password (argumen terpisah, bukan object)
                if (isGantiPassword) {
                    await updatePassword(passwordForm.passwordLama, passwordForm.passwordBaru);
                    setPasswordForm({ passwordLama: "", passwordBaru: "", konfirmasiPassword: "" });
                }

                await update({
                    name: updated.name,
                    image: updated.img,
                });

                setAvatarBase64(null);
                toast.success("Perubahan berhasil disimpan");
                router.refresh();
            } catch (error) {
                console.error(error);
                let message = "Terjadi kesalahan saat menyimpan perubahan";
                if (error instanceof Error) {
                    if (error.message === "EmailTaken") message = "Email sudah digunakan";
                    else if (error.message === "FileTooLarge") message = "Ukuran foto terlalu besar";
                    else if (error.message === "UploadFailed") message = "Gagal mengunggah foto";
                    else message = error.message;
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

                    <div className="space-y-1.5">
                        <Label htmlFor="kepala_sekolah" className="text-sm text-gray-600">
                            Nama Penanggung Jawab
                        </Label>
                        <Input
                            id="kepala_sekolah"
                            type="text"
                            value={profileForm.kepala_sekolah}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, kepala_sekolah: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="Kepala Sekolah SMK"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="deskripsi_smk" className="text-sm text-gray-600">
                            Deskripsi SMK
                        </Label>
                        <Textarea
                            id="deskripsi_smk"
                            value={profileForm.deskripsi_smk}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, deskripsi_smk: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300 min-h-24"
                            placeholder="Ceritakan singkat tentang SMK ini, keahlian yang diajarkan, dsb. Teks ini akan tampil di halaman detail SMK."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm text-gray-600">
                            Nomor Telepon
                        </Label>
                        <Input
                            id="phone"
                            type="text"
                            value={profileForm.phone}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, phone: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="Nomor Telepon"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="alamat" className="text-sm text-gray-600">
                            Alamat
                        </Label>
                        <Input
                            id="alamat"
                            type="text"
                            value={profileForm.alamat}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, alamat: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="alamat SMK"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="kota" className="text-sm text-gray-600">
                            Kota
                        </Label>
                        <Input
                            id="kota"
                            type="text"
                            value={profileForm.kota}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, kota: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="kota"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="provinsi" className="text-sm text-gray-600">
                            Provinsi
                        </Label>
                        <Input
                            id="provinsi"
                            type="text"
                            value={profileForm.provinsi}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, provinsi: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="provinsi"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="map_link" className="text-sm text-gray-600">
                            Link Embed Lokasi (Google Maps)
                        </Label>
                        <Input
                            id="map_link"
                            type="url"
                            value={profileForm.map_link}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, map_link: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="https://www.google.com/maps/embed?pb=..."
                        />
                        <p className="text-xs text-gray-400">
                            Buka Google Maps → cari lokasi sekolah → Bagikan → Sematkan peta → salin
                            link di dalam <span className="font-mono">src=&quot;...&quot;</span> lalu tempel di sini.
                        </p>

                        {profileForm.map_link && (
                            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                                <iframe
                                    src={profileForm.map_link}
                                    width="100%"
                                    height="220"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Preview Lokasi"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="tahun_berdiri" className="text-sm text-gray-600">
                            Tahun Berdiri
                        </Label>
                        <Input
                            id="tahun_berdiri"
                            type="number"
                            value={profileForm.tahun_berdiri}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, tahun_berdiri: e.target.value })
                            }
                            className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
                            placeholder="tahun berdiri SMK"
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