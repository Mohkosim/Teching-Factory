"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Image from "next/image";

export default function AboutTefa() {
    const [form, setForm] = useState({
        description: "",
        videoLink: "",
        files: [] as File[],
    });

    const handleSave = () => {
        // TODO: kirim data ke API
        console.log("Submit:", form);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files ?? []);
        if (newFiles.length > 0) {
            // Gabungkan dengan file yang sudah ada
            setForm((prev) => ({ ...prev, files: [...prev.files, ...newFiles] }));
        }
        // Reset input agar file yang sama bisa dipilih lagi
        e.target.value = "";
    };

    const handleRemoveFile = (index: number) => {
        setForm((prev) => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index),
        }));
    };

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

                {/* Deskripsi */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-800">Deskripsi</label>
                    <textarea
                        placeholder="Masukkan Deskripsi"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={5}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Link Video Profil */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-800">Link Video Profil</label>
                    <Input
                        placeholder="Masukkan Link Video Profil"
                        value={form.videoLink}
                        onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
                        className="rounded-xl border-gray-200 bg-white"
                    />
                </div>

                {/* Upload Dokumentasi */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-800">Upload Dokumentasi</label>

                    {/* Area Drop */}
                    <div
                        className="border border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => document.getElementById("tefa-dokumentasi-input")?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const dropped = Array.from(e.dataTransfer.files).filter((f) =>
                                f.type.startsWith("image/")
                            );
                            if (dropped.length > 0) {
                                setForm((prev) => ({ ...prev, files: [...prev.files, ...dropped] }));
                            }
                        }}
                    >
                        <p className="text-sm text-gray-400">Seret dan letakkan file di sini</p>
                        <p className="text-xs text-gray-400 mt-0.5">atau klik untuk menelusuri</p>
                        <button
                            type="button"
                            className="mt-3 px-5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-full transition-colors"
                        >
                            Upload
                        </button>
                        <input
                            id="tefa-dokumentasi-input"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Preview Grid */}
                    {form.files.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            {form.files.map((f, i) => (
                                <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                                    <Image
                                        src={URL.createObjectURL(f)}
                                        alt={`preview-${i}`}
                                        className="h-full w-full object-cover"
                                    />
                                    {/* Tombol X */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFile(i);
                                        }}
                                        className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow transition-colors opacity-0 group-hover:opacity-100"
                                        title="Hapus foto"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                    {/* Nama file */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs truncate">{f.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {form.files.length > 0 && (
                        <p className="text-xs text-gray-400">{form.files.length} foto dipilih</p>
                    )}
                </div>

                {/* Tombol Simpan */}
                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleSave}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8 shadow-sm shadow-blue-200"
                    >
                        Simpan
                    </Button>
                </div>
            </div>
        </div>
    );
}