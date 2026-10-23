import "server-only";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";

export interface TarifOngkir {
    code: string;
    name: string;
    service: string;
    description?: string;
    cost: number;
    etd?: string;
}

export interface HasilTarif {
    data: TarifOngkir[];
    tanpaKurirAktif: boolean;
    semuaGagal: boolean;
    errors: { courier: string; error: string; status: number }[];
}

export async function hitungTarifJurusan(params: {
    originId: number;
    destinationId: number;
    weight: number;
    jurusanId: string;
}): Promise<HasilTarif> {
    const apiKey = process.env.RAJAONGKIR_API_KEY;
    const kurirAktif = await prisma.kurirAktif.findMany({
        where: { jurusan_id: params.jurusanId, status: true },
    });
    if (kurirAktif.length === 0) {
        return { data: [], tanpaKurirAktif: true, semuaGagal: false, errors: [] };
    }
    if (!apiKey) throw new Error("RAJAONGKIR_API_KEY belum dikonfigurasi");

    const hasil = await Promise.all(
        kurirAktif.map(async ({ kode_kurir: courier }) => {
            const body = new URLSearchParams({
                origin: String(params.originId),
                destination: String(params.destinationId),
                weight: String(params.weight),
                courier,
                price: "lowest",
            });
            const res = await fetch(`${BASE_URL}/calculate/domestic-cost`, {
                method: "POST",
                headers: {
                    key: apiKey,
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                },
                body,
                cache: "no-store",
            });
            if (!res.ok) {
                const text = await res.text();
                console.error(`RajaOngkir cost error (${courier}):`, res.status, text);
                return { courier, error: text, status: res.status, data: [] as TarifOngkir[] };
            }
            const json = await res.json();
            return { courier, data: (json?.data ?? []) as TarifOngkir[] };
        })
    );

    const data = hasil.flatMap((r) => r.data);
    const errors = hasil
        .filter((r): r is typeof r & { error: string; status: number } => "error" in r)
        .map((r) => ({ courier: r.courier, error: r.error, status: r.status }));

    return { data, tanpaKurirAktif: false, semuaGagal: data.length === 0 && errors.length === kurirAktif.length, errors };
}
