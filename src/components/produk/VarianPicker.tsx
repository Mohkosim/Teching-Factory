"use client";

import { useMemo, useState } from "react";
import type { VarianGrupPublic, VarianKombinasiPublic } from "@/lib/data/produk-public";
import { formatRupiah } from "@/lib/utils/format";

export function useVarianPicker(
    varianGrup: VarianGrupPublic[] | undefined,
    varianKombinasi: VarianKombinasiPublic[] | undefined
) {
    const [selectedOpsi, setSelectedOpsi] = useState<Record<string, string>>({});

    const kombinasiTerpilih: VarianKombinasiPublic | null = useMemo(() => {
        if (!varianGrup || !varianKombinasi || varianGrup.length === 0) return null;
        if (Object.keys(selectedOpsi).length !== varianGrup.length) return null;

        const targetOpsiIds = Object.values(selectedOpsi);
        return (
            varianKombinasi.find((k) => {
                if (k.opsiIds.length !== targetOpsiIds.length) return false;
                return targetOpsiIds.every((id) => k.opsiIds.includes(id));
            }) ?? null
        );
    }, [selectedOpsi, varianGrup, varianKombinasi]);

    const pilihOpsi = (grupId: string, opsiId: string) => {
        setSelectedOpsi((prev) => ({ ...prev, [grupId]: opsiId }));
    };

    const isLengkap = !!varianGrup && Object.keys(selectedOpsi).length === varianGrup.length;

    return { selectedOpsi, pilihOpsi, kombinasiTerpilih, isLengkap };
}

export default function VarianPicker({
    varianGrup,
    selectedOpsi,
    onPilih,
}: {
    varianGrup: VarianGrupPublic[];
    selectedOpsi: Record<string, string>;
    onPilih: (grupId: string, opsiId: string) => void;
}) {
    return (
        <div className="space-y-4">
            {varianGrup.map((grup) => (
                <div key={grup.grup_id}>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{grup.nama}</p>
                    <div className="flex flex-wrap gap-2">
                        {grup.opsi.map((opsi) => {
                            const aktif = selectedOpsi[grup.grup_id] === opsi.opsi_id;
                            return (
                                <button
                                    key={opsi.opsi_id}
                                    type="button"
                                    onClick={() => onPilih(grup.grup_id, opsi.opsi_id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                        aktif
                                            ? "border-sky-500 bg-sky-50 text-sky-600 font-medium"
                                            : "border-gray-200 text-gray-600 hover:border-sky-300"
                                    }`}
                                >
                                    {opsi.nama}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function VarianHargaStok({ kombinasi }: { kombinasi: VarianKombinasiPublic | null }) {
    if (!kombinasi) {
        return <p className="text-xs text-amber-600">Pilih semua varian dulu</p>;
    }
    return (
        <p className="text-xs text-gray-500">
            {formatRupiah(kombinasi.harga)} &middot; Stok {kombinasi.stok}
        </p>
    );
}