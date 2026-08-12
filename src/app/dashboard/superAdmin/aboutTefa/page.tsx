"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { X, Loader2, ImagePlus } from "lucide-react";
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
import { saveTentangTefa, deleteTentangFoto } from "@/lib/api/tentang";
import { TentangTefaFotoApi } from "@/types/interfaces/tentang";

const MAX_FILES = 8;

export default function AboutTefa() {
    const [form, setForm] = useState({
        description: "",
        videoLink: "",
        files: [] as File[],
    });
    const [existingPhotos, setExistingPhotos] = useState<TentangTefaFotoApi[]>([]);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const updated = await saveTentangTefa({
                deskripsi: form.description,
                videoLink: form.videoLink,
                files: form.files,
            });
            setExistingPhotos(updated.dokumentasi);
            setForm((prev) => ({ ...prev, files: [] }));
            toast.success("Data berhasil disimpan");
        } catch (error) {
            toast.error("Gagal menyimpan data", {
                description: error instanceof Error ? error.message : "Coba lagi",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files ?? []);
        if (newFiles.length > 0) {
            setForm((prev) => ({ ...prev, files: [...prev.files, ...newFiles] }));
        }
        e.target.value = "";
    };

    const handleRemoveFile = (index: number) => {
        setForm((prev) => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index),
        }));
    };

    const handleRemoveExistingPhoto = async (fotoId: string) => {
        const prevPhotos = [...existingPhotos];
        setExistingPhotos((prev) => prev.filter((p) => p.foto_id !== fotoId));
        try {
            await deleteTentangFoto(fotoId);
            toast.success("Foto dihapus");
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("Gagal menghapus foto");
            setExistingPhotos(prevPhotos);
        }
    };

    const totalFoto = existingPhotos.length + form.files.length;

    return (
        <div className="space-y-6 px-6">
            {/* ── Page Header ── */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Tentang Tefa
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Manajemen</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Tentang</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* ── Form Card ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

                <>
                    {/* Deskripsi */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-800">Deskripsi</label>
                        <textarea
                            placeholder="Masukkan Deskripsi"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={5}
                            disabled={saving}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Link Video Profil */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-800">Link Video Profil</label>
                        <Input
                            placeholder="Masukkan Link Video Profil (YouTube)"
                            value={form.videoLink}
                            onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
                            disabled={saving}
                            className="rounded-xl border-gray-200 bg-white"
                        />
                    </div>

                    {/* Upload Dokumentasi */}
                    <div className="space-y-1.5">
                        <Label className="text-sm text-gray-600">
                            Dokumentasi (maks {MAX_FILES}, @2MB)
                        </Label>

                        <div className="flex flex-wrap gap-2">
                            {existingPhotos.map((foto) => (
                                <div
                                    key={foto.foto_id}
                                    className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 group"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={foto.url} alt="" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExistingPhoto(foto.foto_id)}
                                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}

                            {form.files.map((f, i) => (
                                <div
                                    key={`new-${i}`}
                                    className="relative h-20 w-20 rounded-lg overflow-hidden border border-sky-200 group"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={URL.createObjectURL(f)}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFile(i)}
                                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}

                            {totalFoto < MAX_FILES && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors"
                                >
                                    <ImagePlus className="h-5 w-5" />
                                    <span className="text-[10px] mt-1">Tambah</span>
                                </button>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Tombol Simpan */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8 shadow-sm shadow-blue-200"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan"
                            )}
                        </Button>
                    </div>
                </>
            </div>
        </div>
    );
}