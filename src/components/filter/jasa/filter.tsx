"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, ChevronDown } from "lucide-react";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const ratingOptions = [5, 3, 2];

export interface FilterJasaValue {
    lokasi: string[];
    rating: number | null;
    hargaMin: string;
    hargaMax: string;
}

export const emptyFilterJasaValue: FilterJasaValue = {
    lokasi: [],
    rating: null,
    hargaMin: "",
    hargaMax: "",
};

interface FilterProps {
    value: FilterJasaValue;
    onApply: (value: FilterJasaValue) => void;
    lokasiOptions: string[]; // <-- diambil dari data asli, bukan hardcode
}

export default function FilterJasa({ value, onApply, lokasiOptions }: FilterProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<FilterJasaValue>(value);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            setDraft(value);
        }
    };

    const toggleLokasi = (v: string) => {
        setDraft((prev) => ({
            ...prev,
            lokasi: prev.lokasi.includes(v)
                ? prev.lokasi.filter((x) => x !== v)
                : [...prev.lokasi, v],
        }));
    };

    const lokasiUnik = useMemo(() => {
        return Array.from(new Set(lokasiOptions));
    }, [lokasiOptions]);

    const handleHapus = () => {
        setDraft(emptyFilterJasaValue);
        onApply(emptyFilterJasaValue);
        setOpen(false);
    };

    const handleSubmit = () => {
        onApply(draft);
        setOpen(false);
    };

    const isFilterAktif =
        value.lokasi.length > 0 || value.rating !== null || value.hargaMin !== "" || value.hargaMax !== "";

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button className="w-full px-3 py-1.5 sm:w-48 text-left outline-none">
                    <span className="block text-xs text-gray-400">Filter</span>
                    <span className="flex items-center justify-between text-base font-medium text-gray-900">
                        {isFilterAktif ? "Filter aktif" : "Semua"}
                        <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                    </span>
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-0 rounded-2xl max-h-[80vh] overflow-y-auto" align="start">
                <div className="px-5 py-4">
                    <h3 className="text-lg font-bold text-gray-900">Filter Jasa</h3>
                </div>

                {/* --- BLOK LOKASI --- */}
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    <p className="text-sm font-medium text-gray-400">Lokasi</p>
                    {lokasiUnik.length === 0 ? (
                        <p className="text-sm text-gray-400">Belum ada data lokasi</p>
                    ) : (
                        lokasiUnik.map((loc) => (
                            <label key={loc} className="flex items-center gap-3 cursor-pointer">
                                <Checkbox
                                    checked={draft.lokasi.includes(loc)}
                                    onCheckedChange={() => toggleLokasi(loc)}
                                    className="h-5 w-5 rounded-sm data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800"
                                />
                                <span className="text-base font-semibold text-gray-900">{loc}</span>
                            </label>
                        ))
                    )}
                </div>

                {/* --- BLOK RATING --- */}
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    <p className="text-sm font-medium text-gray-400">Penilaian</p>
                    {ratingOptions.map((r) => (
                        <label key={r} className="flex items-center gap-3 cursor-pointer">
                            <Checkbox
                                checked={draft.rating === r}
                                onCheckedChange={() =>
                                    setDraft((prev) => ({ ...prev, rating: prev.rating === r ? null : r }))
                                }
                                className="h-5 w-5 rounded-sm data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800"
                            />
                            <span className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`h-5 w-5 ${i < r ? "fill-amber-400 text-amber-400" : "fill-gray-300 text-gray-300"
                                            }`}
                                    />
                                ))}
                            </span>
                        </label>
                    ))}
                </div>

                {/* --- BLOK HARGA --- */}
                <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                    <p className="text-sm font-medium text-gray-400">Batas Harga</p>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 pointer-events-none">
                            Rp
                        </span>
                        <Input
                            type="number"
                            value={draft.hargaMin}
                            onChange={(e) => setDraft((prev) => ({ ...prev, hargaMin: e.target.value }))}
                            placeholder="Harga Minimum"
                            className="bg-gray-100 border-0 rounded-lg pl-10 h-10 text-sm"
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 pointer-events-none">
                            Rp
                        </span>
                        <Input
                            type="number"
                            value={draft.hargaMax}
                            onChange={(e) => setDraft((prev) => ({ ...prev, hargaMax: e.target.value }))}
                            placeholder="Harga Maksimum"
                            className="bg-gray-100 border-0 rounded-lg pl-10 h-10 text-sm"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-100 px-5 py-4 flex items-center gap-3">
                    <Button
                        onClick={handleHapus}
                        variant="outline"
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 border-0 rounded-xl h-10 font-semibold"
                    >
                        Hapus
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="outline"
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-500 border-0 rounded-xl h-10 font-semibold"
                    >
                        Submit
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}