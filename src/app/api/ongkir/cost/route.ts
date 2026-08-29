import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const API_KEY = process.env.RAJAONGKIR_API_KEY!;

export async function POST(req: NextRequest) {
  const { originId, destinationId, weight, jurusanId } = await req.json();

  if (!originId || !destinationId || !weight || !jurusanId) {
    return NextResponse.json(
      { error: "originId, destinationId, weight, dan jurusanId wajib diisi" },
      { status: 400 }
    );
  }

  const kurirAktif = await prisma.kurirAktif.findMany({
    where: { jurusan_id: jurusanId, status: true },
  });

  if (kurirAktif.length === 0) {
    return NextResponse.json(
      { error: "Jurusan ini belum mengaktifkan kurir pengiriman apapun", data: [] },
      { status: 200 } // bukan error server, tapi kondisi valid yang perlu ditangani di client
    );
  }

  const couriers = kurirAktif.map((k) => k.kode_kurir);

  try {
    const perCourierResults = await Promise.all(
      couriers.map(async (courier) => {
        const body = new URLSearchParams({
          origin: String(originId),
          destination: String(destinationId),
          weight: String(weight),
          courier,
          price: "lowest",
        });

        const res = await fetch(`${BASE_URL}/calculate/domestic-cost`, {
          method: "POST",
          headers: {
            key: API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body,
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          console.error(`RajaOngkir cost error (${courier}):`, res.status, text);
          return { courier, error: text, status: res.status, data: [] as unknown[] };
        }

        const json = await res.json();
        return { courier, data: json?.data ?? [] };
      })
    );

    const allData = perCourierResults.flatMap((r) => r.data);
    const errors = perCourierResults.filter((r) => "error" in r);

    if (allData.length === 0 && errors.length === couriers.length) {
      return NextResponse.json(
        {
          error: "Semua kurir gagal dihitung. Cek origin/destination id atau kuota API.",
          details: errors,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: allData });
  } catch (err) {
    console.error("RajaOngkir cost error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data ongkos kirim" },
      { status: 500 }
    );
  }
}