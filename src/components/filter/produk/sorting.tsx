"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export type SortOption = "Terpopuler" | "Terbaru" | "Terlama" | "";

interface SortingProps {
    value: SortOption;
    onApply: (value: SortOption) => void;
}

export default function Sorting({ value, onApply }: SortingProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<SortOption>(value);

    // Reset draft setiap kali popover dibuka
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            setDraft(value);
        }
    };

    const handleHapus = () => {
        setDraft("");
        onApply("");
        setOpen(false);
    };

    const handleSubmit = () => {
        onApply(draft);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button className="w-full px-3 py-1.5 sm:w-48 text-left outline-none">
                    <span className="block text-xs text-gray-400">Sorting</span>
                    <span className="flex items-center justify-between text-base font-medium text-gray-900">
                        {value || "Semua"}
                        <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                    </span>
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-64 p-0 rounded-2xl shadow-xl" align="start">
                <div className="px-5 py-4">
                    <h3 className="text-lg font-bold text-gray-900">Sorting</h3>
                </div>

                <div className="px-5 py-4 space-y-3 border-t">
                    {(["Terpopuler", "Terbaru", "Terlama"] as SortOption[]).map((opt) => (
                        <label key={opt} className="flex items-center gap-3 cursor-pointer">
                            <Checkbox
                                checked={draft === opt}
                                onCheckedChange={() => setDraft(draft === opt ? "" : opt)}
                                className="h-5 w-5 rounded-sm data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800"
                            />
                            <span className="text-base font-medium text-gray-900">{opt}</span>
                        </label>
                    ))}
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