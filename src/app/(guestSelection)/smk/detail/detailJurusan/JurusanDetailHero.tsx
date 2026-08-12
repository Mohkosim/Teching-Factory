"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { JurusanDetailData } from "@/types/interfaces/jurusan";
import { ProdukTypeFilter } from "@/types/interfaces/produk";

const TYPE_OPTIONS: { value: ProdukTypeFilter; label: string }[] = [
    { value: "semua", label: "Semua" },
    { value: "produk", label: "Produk" },
    { value: "jasa", label: "Jasa" },
];

function TypeFilterDropdown({
    value,
    onChange,
}: {
    value: ProdukTypeFilter;
    onChange: (value: ProdukTypeFilter) => void;
}) {
    const [open, setOpen] = useState(false);
    const activeLabel = TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? "Semua";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="h-12 w-full px-3 text-left outline-none sm:w-44">
                    <span className="block text-xs text-gray-400">Tipe</span>
                    <span className="flex items-center justify-between text-base font-medium text-gray-900">
                        {activeLabel}
                        <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                    </span>
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-48 rounded-2xl p-2" align="start">
                {TYPE_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => {
                            onChange(opt.value);
                            setOpen(false);
                        }}
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${value === opt.value
                            ? "bg-sky-50 text-sky-600"
                            : "text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </PopoverContent>
        </Popover>
    );
}

export default function JurusanDetailHero({
    jurusan,
    search,
    type,
    onSearchChange,
    onTypeChange,
}: {
    jurusan: JurusanDetailData;
    search: string;
    type: ProdukTypeFilter;
    onSearchChange: (value: string) => void;
    onTypeChange: (value: ProdukTypeFilter) => void;
}) {
    return (
        <section className="relative">
            <div className="relative h-72 w-full overflow-hidden bg-linear-to-b from-sky-900 to-sky-700 sm:h-80">
                <div className="absolute inset-0 bg-[url('/img/hero-bg.jpg')] bg-cover bg-center opacity-30" />
                <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-2 px-4 pb-16 text-center text-white">
                    <div>
                        <p className="text-xs tracking-wide text-white/80">Jurusan &gt; Detail</p>
                        <h1 className="mt-2 text-3xl font-extrabold uppercase sm:text-4xl">
                            {jurusan.nama_jurusan}
                        </h1>
                    </div>

                    <div className="mx-auto mt-8 flex w-full max-w-4xl flex-col gap-3 rounded-4xl bg-white p-4 shadow-lg sm:flex-row sm:items-center">
                        <div className="relative flex-1 rounded-2xl border-2 border-gray-200">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Cari produk atau jasa..."
                                className="h-12 border-0 pl-11 text-base text-gray-900 placeholder:text-gray-400 shadow-none focus-visible:ring-0"
                            />
                        </div>

                        <div className="hidden h-10 w-px bg-gray-200 sm:block" />

                        <TypeFilterDropdown value={type} onChange={onTypeChange} />
                    </div>
                </div>
            </div>

            <div className="relative z-10 mx-auto -mt-20 max-w-4xl px-4 pb-8">
                <div className="flex flex-col items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-md sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900">{jurusan.nama_jurusan}</h2>
                        {jurusan.deskripsi && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{jurusan.deskripsi}</p>
                        )}
                        <div className="mt-3 flex gap-6">
                            <div>
                                <span className="text-lg font-bold text-blue-600">{jurusan.jumlahBarang}</span>
                                <p className="border-t border-blue-200 pt-1 text-xs font-medium text-blue-600">
                                    Produk
                                </p>
                            </div>
                            <div>
                                <span className="text-lg font-bold text-blue-600">{jurusan.jumlahJasa}</span>
                                <p className="border-t border-blue-200 pt-1 text-xs font-medium text-blue-600">
                                    Jasa
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative h-20 w-20 shrink-0">
                        <Image
                            src={jurusan.img || "/img/logo.png"}
                            alt={jurusan.nama_jurusan}
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}