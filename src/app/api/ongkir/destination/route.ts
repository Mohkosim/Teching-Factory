import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const API_KEY = process.env.RAJAONGKIR_API_KEY!;

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search");

  if (!search) {
    return NextResponse.json(
      { error: "Parameter search wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${BASE_URL}/destination/domestic-destination?search=${encodeURIComponent(
        search
      )}&limit=5&offset=0`,
      {
        headers: { key: API_KEY },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("RajaOngkir destination error:", res.status, text);
      return NextResponse.json(
        { error: "Gagal mencari kota" },
        { status: res.status === 429 ? 429 : 500 }
      );
    }

    const json = await res.json();
    return NextResponse.json({ data: json?.data ?? [] });
  } catch (err) {
    console.error("RajaOngkir destination fetch error:", err);
    return NextResponse.json(
      { error: "Gagal mencari kota" },
      { status: 500 }
    );
  }
}