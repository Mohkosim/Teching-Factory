"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import { FaUserCircle, FaCamera } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { updateProfile, uploadAvatar } from "@/lib/api/profile-api";

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

type Gender = "Laki_laki" | "Perempuan";

interface ProfileClientProps {
  initialNama: string;
  initialEmail: string;
  initialTelepon: string;
  initialGender: Gender | undefined;
  initialAvatar: string | null;
}

export default function ProfileClient({
  initialNama,
  initialEmail,
  initialTelepon,
  initialGender,
  initialAvatar,
}: ProfileClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  const [nama, setNama] = useState(initialNama);
  const [email, setEmail] = useState(initialEmail);
  const [telepon, setTelepon] = useState(initialTelepon);
  const [gender, setGender] = useState<Gender | undefined>(initialGender);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatar);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setAvatarBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    tampilkanLoading("Menyimpan profil...");

    try {
      let imgUrl: string | undefined = undefined;

      if (avatarBase64) {
        imgUrl = await uploadAvatar(avatarBase64);
      }

      await updateProfile({
        name: nama,
        email,
        phone: telepon,
        ...(gender ? { gender } : {}),
        ...(imgUrl ? { img: imgUrl } : {}),
      });

      Swal.close();
      toast.success("Profil berhasil diperbarui");
      setAvatarBase64(null);
    } catch (err) {
      Swal.close();
      const message = err instanceof Error ? err.message : "Gagal menyimpan profil";
      toast.error(
        message === "EmailTaken"
          ? "Email sudah digunakan akun lain"
          : message === "FileTooLarge"
            ? "Ukuran foto maksimal 2MB"
            : "Gagal menyimpan profil, coba lagi"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-6 px-4 md:px-8">
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
        <ProfileSidebar avatarPreview={avatarPreview} nama={nama} loading={false} />

        <section className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-black text-gray-900">Profil Saya</h1>
          <p className="text-sm text-gray-400 mt-1">
            Kelola informasi profil Anda untuk mengontrol, melindungi dan mengamankan akun
          </p>

          <div className="border-t border-gray-100 mt-4 pt-6">
            <form className="space-y-4 w-full" onSubmit={handleSubmit}>
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
                  <Label htmlFor="nama" className="text-sm text-gray-700">Nama</Label>
                  <Input
                    id="nama"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="rounded-lg border-gray-200 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg border-gray-200 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telepon" className="text-sm text-gray-700">Nomor Telepon</Label>
                  <Input
                    id="telepon"
                    type="tel"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    className="rounded-lg border-gray-200 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-sm text-gray-700">Jenis Kelamin</Label>
                  <Select
                    value={gender}
                    onValueChange={(val) => setGender(val as Gender)}
                  >
                    <SelectTrigger id="gender" className="rounded-lg border-gray-200 h-10 w-full">
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki_laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-sky-400 hover:bg-sky-500 text-white font-bold px-6 h-10"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}