"use client";

import { useState } from "react";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { tampilkanLoading, confirmHapus } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import {
  createAlamat,
  updateAlamat,
  deleteAlamat,
  getAlamatList,
} from "@/lib/api/profile-api";
import type { AlamatData } from "@/types/interfaces/alamat";
import type { ReverseGeocodeResult } from "@/components/AddressMapPicker";
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
import { searchOngkirDestination, type OngkirDestination } from "@/lib/api/ongkir-api";

const AddressMapPicker = dynamic(
  () => import("@/components/AddressMapPicker"),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-gray-100 animate-pulse" /> }
);

const initialForm = {
  nama_penerima: "",
  nomor_telepon: "",
  alamat_lengkap: "",
  kota: "",
  kecamatan: "",
  provinsi: "",
  kota_id: null as number | null,
  kode_pos: "",
  isUtama: false,
};

interface AlamatClientProps {
  initialNama: string;
  initialAvatar: string | null;
  initialTelepon: string;
  initialAlamatList: AlamatData[];
}

export default function AlamatClient({
  initialNama,
  initialAvatar,
  initialTelepon,
  initialAlamatList,
}: AlamatClientProps) {
  const [saving, setSaving] = useState(false);
  const [alamatList, setAlamatList] = useState<AlamatData[]>(initialAlamatList);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...initialForm,
    nama_penerima: initialNama,
    nomor_telepon: initialTelepon,
  });

  const [destinationOptions, setDestinationOptions] = useState<{
    kota: OngkirDestination[];
    kecamatan: OngkirDestination[];
  }>({ kota: [], kecamatan: [] });
  const [searchingDestination, setSearchingDestination] = useState({ kota: false, kecamatan: false });

  const openTambahDialog = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...initialForm,
      nama_penerima: prev.nama_penerima,
      nomor_telepon: prev.nomor_telepon,
    }));
    setIsDialogOpen(true);
  };

  const openEditDialog = (alamat: AlamatData) => {
    setEditingId(alamat.alamat_id);
    setForm({
      nama_penerima: alamat.nama_penerima,
      nomor_telepon: alamat.nomor_telepon,
      alamat_lengkap: alamat.alamat_lengkap,
      kota: alamat.kota,
      kecamatan: alamat.kecamatan,
      provinsi: alamat.provinsi,
      kota_id: alamat.kota_id,
      kode_pos: alamat.kode_pos,
      isUtama: alamat.isUtama,
    });
    setIsDialogOpen(true);
  };

  const handleHapus = async (alamat: AlamatData) => {
    const confirmed = await confirmHapus(alamat.nama_penerima);
    if (!confirmed) return;

    tampilkanLoading("Menghapus alamat...");
    try {
      await deleteAlamat(alamat.alamat_id);
      const fresh = await getAlamatList();
      setAlamatList(fresh);
      Swal.close();
      toast.success("Alamat berhasil dihapus");
    } catch {
      Swal.close();
      toast.error("Gagal menghapus alamat");
    }
  };

  const handleJadikanUtama = async (id: string) => {
    tampilkanLoading("Mengubah alamat utama...");
    try {
      await updateAlamat(id, { isUtama: true });
      const fresh = await getAlamatList();
      setAlamatList(fresh);
      Swal.close();
      toast.success("Alamat utama berhasil diubah");
    } catch {
      Swal.close();
      toast.error("Gagal mengubah alamat utama");
    }
  };

  const handleLocationSelect = async (result: ReverseGeocodeResult) => {
    setForm((prev) => ({
      ...prev,
      alamat_lengkap: result.alamat_lengkap,
      kota: result.kota,
      kecamatan: result.kecamatan,
      provinsi: result.provinsi,
      kode_pos: result.kode_pos,
      kota_id: null,
    }));

    try {
      const query = [result.kecamatan, result.kota].filter(Boolean).join(", ");
      const matches = await searchOngkirDestination(query || result.kota);

      if (matches.length > 0) {
        setForm((prev) => ({ ...prev, kota_id: matches[0].id }));
        toast.success("Alamat & kecamatan terisi otomatis dari peta");
      } else {
        toast.error("Kota/kecamatan tidak ditemukan otomatis, cari manual di bawah");
      }
    } catch {
      toast.error("Gagal mencocokkan kota/kecamatan, cari manual di bawah");
    }
  };

  const handleSimpan = async () => {
    if (
      !form.nama_penerima ||
      !form.nomor_telepon ||
      !form.alamat_lengkap ||
      !form.kota ||
      !form.kecamatan ||
      !form.provinsi ||
      !form.kode_pos
    ) {
      toast.error("Lengkapi semua field terlebih dahulu");
      return;
    }
    if (!form.kota_id) {
      toast.error("Pilih kota/kecamatan dari hasil pencarian terlebih dahulu");
      return;
    }

    setSaving(true);
    tampilkanLoading(editingId ? "Memperbarui alamat..." : "Menambahkan alamat...");
    try {
      if (editingId) {
        await updateAlamat(editingId, form);
        Swal.close();
        toast.success("Alamat berhasil diperbarui");
      } else {
        await createAlamat(form);
        Swal.close();
        toast.success("Alamat berhasil ditambahkan");
      }
      const fresh = await getAlamatList();
      setAlamatList(fresh);
      setIsDialogOpen(false);
    } catch (err) {
      Swal.close();
      const message = err instanceof Error ? err.message : "Gagal menyimpan alamat";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSearchDestination = async (field: "kota" | "kecamatan", query: string) => {
    if (query.length < 3) {
      setDestinationOptions((prev) => ({ ...prev, [field]: [] }));
      return;
    }

    setSearchingDestination((prev) => ({ ...prev, [field]: true }));
    try {
      const results = await searchOngkirDestination(query);
      setDestinationOptions((prev) => ({ ...prev, [field]: results }));
    } catch {
      setDestinationOptions((prev) => ({ ...prev, [field]: [] }));
    } finally {
      setSearchingDestination((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleSelectDestination = (field: "kota" | "kecamatan", dest: OngkirDestination) => {
    const [kecamatanLabel, kotaLabel] = dest.label.split(",").map((s) => s.trim());

    setForm((prev) => ({
      ...prev,
      kota_id: dest.id,
      kota: kotaLabel || prev.kota,
      kecamatan: kecamatanLabel || prev.kecamatan,
      provinsi: dest.provinsi || prev.provinsi,
    }));
    setDestinationOptions((prev) => ({ ...prev, [field]: [] }));
  };

  return (
    <div className="min-h-screen py-6 px-4 md:px-8">
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
        <ProfileSidebar avatarPreview={initialAvatar} nama={initialNama} loading={false} />

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
                    key={alamat.alamat_id}
                    className="border border-gray-100 rounded-xl p-5 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm">{alamat.nama_penerima}</p>
                        {alamat.isUtama && (
                          <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{alamat.nomor_telepon}</p>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-lg">
                        {alamat.alamat_lengkap}, {alamat.kecamatan}, {alamat.kota}, {alamat.provinsi} {alamat.kode_pos}
                      </p>
                      {!alamat.isUtama && (
                        <button
                          type="button"
                          onClick={() => handleJadikanUtama(alamat.alamat_id)}
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
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sky-600 bg-sky-50 hover:bg-sky-200 hover:text-sky-700 transition-colors"
                        aria-label="Edit alamat"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHapus(alamat)}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-200 hover:text-red-700 transition-colors"
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

      {/* Tambah alamat dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-gray-100">
            <DialogTitle>{editingId ? "Edit Alamat" : "Tambah Alamat Baru"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <AddressMapPicker onLocationSelect={handleLocationSelect} />

            <div className="space-y-1.5">
              <Label htmlFor="nama_penerima" className="text-sm text-gray-700">Nama Penerima</Label>
              <Input
                id="nama_penerima"
                value={form.nama_penerima}
                onChange={(e) => setForm({ ...form, nama_penerima: e.target.value })}
                className="rounded-lg border-gray-200 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nomor_telepon" className="text-sm text-gray-700">Nomor Telepon</Label>
              <Input
                id="nomor_telepon"
                type="tel"
                value={form.nomor_telepon}
                onChange={(e) => setForm({ ...form, nomor_telepon: e.target.value })}
                className="rounded-lg border-gray-200 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alamat_lengkap" className="text-sm text-gray-700">Alamat Lengkap</Label>
              <Input
                id="alamat_lengkap"
                value={form.alamat_lengkap}
                onChange={(e) => setForm({ ...form, alamat_lengkap: e.target.value })}
                className="rounded-lg border-gray-200 h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 relative">
                <Label htmlFor="kota" className="text-sm text-gray-700">
                  Kota{" "}
                  {form.kota_id && (
                    <span className="text-xs text-green-600 font-normal">✓ Terhubung</span>
                  )}
                </Label>
                <Input
                  id="kota"
                  placeholder="Ketik nama kota..."
                  value={form.kota}
                  autoComplete="off"
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, kota: e.target.value, kota_id: null }));
                    handleSearchDestination("kota", e.target.value);
                  }}
                  className="rounded-lg border-gray-200 h-10"
                />
                {searchingDestination.kota && <p className="text-xs text-gray-400">Mencari...</p>}
                {destinationOptions.kota.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto shadow-sm">
                    {destinationOptions.kota.map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => handleSelectDestination("kota", dest)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50 transition-colors"
                      >
                        {dest.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 relative">
                <Label htmlFor="kecamatan" className="text-sm text-gray-700">
                  Kecamatan{" "}
                  {form.kota_id && (
                    <span className="text-xs text-green-600 font-normal">✓ Terhubung</span>
                  )}
                </Label>
                <Input
                  id="kecamatan"
                  placeholder="Ketik nama kecamatan..."
                  value={form.kecamatan}
                  autoComplete="off"
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, kecamatan: e.target.value, kota_id: null }));
                    handleSearchDestination("kecamatan", e.target.value);
                  }}
                  className="rounded-lg border-gray-200 h-10"
                />
                {searchingDestination.kecamatan && <p className="text-xs text-gray-400">Mencari...</p>}
                {destinationOptions.kecamatan.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto shadow-sm">
                    {destinationOptions.kecamatan.map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => handleSelectDestination("kecamatan", dest)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50 transition-colors"
                      >
                        {dest.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="provinsi" className="text-sm text-gray-700">Provinsi</Label>
                <Input
                  id="provinsi"
                  value={form.provinsi}
                  onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
                  className="rounded-lg border-gray-200 h-10"
                  placeholder="Terisi otomatis dari peta/pencarian"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="kode_pos" className="text-sm text-gray-700">Kode Pos</Label>
                <Input
                  id="kode_pos"
                  value={form.kode_pos}
                  onChange={(e) => setForm({ ...form, kode_pos: e.target.value })}
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

          <DialogFooter className="px-6 py-4 shrink-0 border-t border-gray-100">
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
              disabled={saving}
              className="rounded-lg bg-sky-400 hover:bg-sky-500 text-white font-semibold"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}