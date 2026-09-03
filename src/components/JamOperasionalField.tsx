"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

type Baris = { buka: string; tutup: string; libur: boolean };
type JadwalState = Record<(typeof HARI)[number], Baris>;

const defaultBaris: Baris = { buka: "08:00", tutup: "16:00", libur: false };

function buatDefaultJadwal(): JadwalState {
    return HARI.reduce((acc, hari) => {
        acc[hari] = { ...defaultBaris };
        return acc;
    }, {} as JadwalState);
}

function parseJamOperasional(value: string | null | undefined): JadwalState {
    const jadwal = buatDefaultJadwal();
    if (!value) return jadwal;

    const bagian = value.split("|").map((s) => s.trim());
    for (const b of bagian) {
        const [hariRaw, jamRaw] = b.split(":").map((s) => s.trim());
        const hari = HARI.find((h) => h === hariRaw);
        if (!hari || !jamRaw) continue;

        if (jamRaw.toLowerCase() === "tutup") {
            jadwal[hari] = { buka: "", tutup: "", libur: true };
        } else {
            const [buka, tutup] = jamRaw.split("-").map((s) => s.trim());
            if (buka && tutup) {
                jadwal[hari] = { buka, tutup, libur: false };
            }
        }
    }
    return jadwal;
}

function serializeJamOperasional(jadwal: JadwalState): string {
    return HARI.map((hari) => {
        const b = jadwal[hari];
        if (b.libur || !b.buka || !b.tutup) {
            return `${hari}: Tutup`;
        }
        return `${hari}: ${b.buka} - ${b.tutup}`;
    }).join(" | ");
}

export default function JamOperasionalField({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const [jadwal, setJadwal] = useState<JadwalState>(() => parseJamOperasional(value));
    const [prevValue, setPrevValue] = useState(value);

    if (value !== prevValue) {
        setPrevValue(value);
        setJadwal(parseJamOperasional(value));
    }

    const updateBaris = (hari: (typeof HARI)[number], patch: Partial<Baris>) => {
        const next = { ...jadwal, [hari]: { ...jadwal[hari], ...patch } };
        setJadwal(next);
        onChange(serializeJamOperasional(next));
    };

    return (
        <div className="space-y-2">
            <Label className="text-sm text-gray-600">Jam Operasional</Label>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {HARI.map((hari) => {
                    const baris = jadwal[hari];
                    return (
                        <div
                            key={hari}
                            className="flex items-center gap-3 px-3 py-2 bg-gray-50/50"
                        >
                            <span className="w-16 shrink-0 text-sm font-medium text-gray-600">
                                {hari}
                            </span>

                            {!baris.libur ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input
                                        type="time"
                                        value={baris.buka}
                                        onChange={(e) => updateBaris(hari, { buka: e.target.value })}
                                        className="h-8 text-sm bg-white border-gray-200 rounded-md"
                                    />
                                    <span className="text-gray-400 text-sm">—</span>
                                    <Input
                                        type="time"
                                        value={baris.tutup}
                                        onChange={(e) => updateBaris(hari, { tutup: e.target.value })}
                                        className="h-8 text-sm bg-white border-gray-200 rounded-md"
                                    />
                                </div>
                            ) : (
                                <span className="flex-1 text-sm text-gray-400 italic">Tutup</span>
                            )}

                            <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 cursor-pointer select-none">
                                <Checkbox
                                    checked={baris.libur}
                                    onCheckedChange={(checked) =>
                                        updateBaris(hari, { libur: checked === true })
                                    }
                                />
                                Tutup
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}