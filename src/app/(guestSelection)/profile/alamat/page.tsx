"use client";

import { useRef, useState } from "react";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Alamat {
  id: string;
  namaPenerima: string;
  nomorTelepon: string;
  alamatLengkap: string;
  kota: string;
  kodePos: string;
  isUtama: boolean;
}

const initialForm = {
  namaPenerima: "",
  nomorTelepon: "",
  alamatLengkap: "",
  kota: "",
  kodePos: "",
  isUtama: false,
};

// Data dummy sementara untuk preview tampilan.
// Nanti diganti useState<Alamat[]>([]) + fetch dari API/database.
const DUMMY_ALAMAT: Alamat[] = [
  {
    id: "1",
    namaPenerima: "Budi Santoso",
    nomorTelepon: "081234567890",
    alamatLengkap: "Jl. Merdeka No. 45, RT 03/RW 05, Kelurahan Sukaraja",
    kota: "Bandung",
    kodePos: "40123",
    isUtama: true,
  },
  {
    id: "2",
    namaPenerima: "Budi Santoso (Kantor)",
    nomorTelepon: "081298765432",
    alamatLengkap: "Gedung Cyber Tower Lt. 5, Jl. Kuningan Barat No. 8",
    kota: "Jakarta Selatan",
    kodePos: "12710",
    isUtama: false,
  },
  {
    id: "3",
    namaPenerima: "Siti Aminah",
    nomorTelepon: "085711223344",
    alamatLengkap: "Perumahan Griya Asri Blok C2 No. 10",
    kota: "Sidoarjo",
    kodePos: "61256",
    isUtama: false,
  },
];

export default function AlamatPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview] = useState<string | null>(null);

  const [alamatList, setAlamatList] = useState<Alamat[]>(DUMMY_ALAMAT);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const openTambahDialog = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (alamat: Alamat) => {
    setEditingId(alamat.id);
    setForm({
      namaPenerima: alamat.namaPenerima,
      nomorTelepon: alamat.nomorTelepon,
      alamatLengkap: alamat.alamatLengkap,
      kota: alamat.kota,
      kodePos: alamat.kodePos,
      isUtama: alamat.isUtama,
    });
    setIsDialogOpen(true);
  };

  const handleHapus = (id: string) => {
    setAlamatList((prev) => prev.filter((a) => a.id !== id));
  };

  const handleJadikanUtama = (id: string) => {
    setAlamatList((prev) =>
      prev.map((a) => ({ ...a, isUtama: a.id === id }))
    );
  };

  const handleSimpan = () => {
    if (!form.namaPenerima || !form.nomorTelepon || !form.alamatLengkap) return;

    if (editingId) {
      setAlamatList((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...form } : a))
      );
    } else {
      const alamatBaru: Alamat = {
        id: crypto.randomUUID(),
        ...form,
        isUtama: alamatList.length === 0 ? true : form.isUtama,
      };
      setAlamatList((prev) =>
        alamatBaru.isUtama
          ? [...prev.map((a) => ({ ...a, isUtama: false })), alamatBaru]
          : [...prev, alamatBaru]
      );
    }

    setIsDialogOpen(false);
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
              <BreadcrumbPage>Alamat</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <ProfileSidebar avatarPreview={avatarPreview} onAvatarClick={handleAvatarClick} />

        {/* Main content */}
        <section className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Alamat Saya</h1>
              <p className="text-sm text-gray-400 mt-1">
                Kelola alamat pengiriman Anda. Alamat bisa ditambahkan langsung
                di sini atau saat checkout, dan bisa diubah kapan saja.
              </p>
            </div>
            <Button
              onClick={openTambahDialog}
              className="rounded-lg bg-sky-400 hover:bg-sky-500 text-white font-semibold text-sm px-4 h-10 flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Alamat Baru
            </Button>
          </div>

          <div className="border-t border-gray-100 mt-4 pt-6">
            {alamatList.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 text-gray-400">
                <MapPin className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Belum ada alamat tersimpan</p>
                <p className="text-xs mt-1">Tambahkan alamat pertama Anda untuk mempercepat proses checkout</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alamatList.map((alamat) => (
                  <div
                    key={alamat.id}
                    className="border border-gray-100 rounded-xl p-5 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm">{alamat.namaPenerima}</p>
                        {alamat.isUtama && (
                          <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{alamat.nomorTelepon}</p>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-lg">
                        {alamat.alamatLengkap}, {alamat.kota} {alamat.kodePos}
                      </p>
                      {!alamat.isUtama && (
                        <button
                          type="button"
                          onClick={() => handleJadikanUtama(alamat.id)}
                          className="text-xs font-semibold text-sky-500 hover:text-sky-600 mt-3 transition-colors"
                        >
                          Jadikan alamat utama
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditDialog(alamat)}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                        aria-label="Edit alamat"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHapus(alamat.id)}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                        aria-label="Hapus alamat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Dialog Tambah/Edit Alamat */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Alamat" : "Tambah Alamat Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="namaPenerima" className="text-sm text-gray-700">Nama Penerima</Label>
              <Input
                id="namaPenerima"
                value={form.namaPenerima}
                onChange={(e) => setForm({ ...form, namaPenerima: e.target.value })}
                className="rounded-lg border-gray-200 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nomorTelepon" className="text-sm text-gray-700">Nomor Telepon</Label>
              <Input
                id="nomorTelepon"
                type="tel"
                value={form.nomorTelepon}
                onChange={(e) => setForm({ ...form, nomorTelepon: e.target.value })}
                className="rounded-lg border-gray-200 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alamatLengkap" className="text-sm text-gray-700">Alamat Lengkap</Label>
              <Input
                id="alamatLengkap"
                value={form.alamatLengkap}
                onChange={(e) => setForm({ ...form, alamatLengkap: e.target.value })}
                className="rounded-lg border-gray-200 h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kota" className="text-sm text-gray-700">Kota</Label>
                <Input
                  id="kota"
                  value={form.kota}
                  onChange={(e) => setForm({ ...form, kota: e.target.value })}
                  className="rounded-lg border-gray-200 h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kodePos" className="text-sm text-gray-700">Kode Pos</Label>
                <Input
                  id="kodePos"
                  value={form.kodePos}
                  onChange={(e) => setForm({ ...form, kodePos: e.target.value })}
                  className="rounded-lg border-gray-200 h-10"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isUtama}
                onChange={(e) => setForm({ ...form, isUtama: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
              />
              Jadikan alamat utama
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-lg"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSimpan}
              className="rounded-lg bg-sky-400 hover:bg-sky-500 text-white font-semibold"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}