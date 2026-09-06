"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GaleriGambarModalProps {
    open: boolean;
    onClose: () => void;
    images: string[];
    activeIndex: number;
    onSelect: (index: number) => void;
    title?: string;
}

export default function GaleriGambarModal({
    open,
    onClose,
    images,
    activeIndex,
    onSelect,
    title,
}: GaleriGambarModalProps) {
    useEffect(() => {
        if (!open) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") onSelect((activeIndex - 1 + images.length) % images.length);
            if (e.key === "ArrowRight") onSelect((activeIndex + 1) % images.length);
        }

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, activeIndex, images.length, onClose, onSelect]);

    if (!open) return null;

    const geser = (arah: 1 | -1) => {
        onSelect((activeIndex + arah + images.length) % images.length);
    };

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:h-[85vh] md:flex-row"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Gambar utama */}
                <div className="relative min-h-[50vh] flex-1 bg-gray-50 md:min-h-0">
                    <Image
                        src={images[activeIndex]}
                        alt={title ?? "Gambar"}
                        fill
                        className="object-contain"
                    />

                    {images.length > 1 && (
                        <>
                            <button
                                onClick={() => geser(-1)}
                                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => geser(1)}
                                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}
                </div>

                {images.length > 1 && (
                    <div className="w-full shrink-0 border-t border-gray-100 p-4 md:w-64 md:overflow-y-auto md:border-l md:border-t-0">
                        {title && (
                            <p className="mb-3 hidden text-sm font-semibold text-gray-800 md:block">{title}</p>
                        )}
                        <div className="grid grid-cols-4 gap-2 md:grid-cols-3">
                            {images.map((src, i) => (
                                <button
                                    key={src + i}
                                    onClick={() => onSelect(i)}
                                    className={cn(
                                        "relative aspect-square overflow-hidden rounded-lg border-2",
                                        activeIndex === i ? "border-sky-500" : "border-transparent"
                                    )}
                                >
                                    <Image src={src} alt={`${title ?? "Gambar"} ${i + 1}`} fill className="object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}