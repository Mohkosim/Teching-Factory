import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const API_KEY = process.env.RAJAONGKIR_API_KEY!;

export async function POST(req: NextRequest) {
  const { awb, courier, lastPhoneNumber } = await req.json();
  if (!awb || !courier) {
    return NextResponse.json({ error: "awb dan courier wajib diisi" }, { status: 400 });
  }
  try {
    const params = new URLSearchParams({ awb, courier });
    if (lastPhoneNumber) params.set("last_phone_number", lastPhoneNumber);

    const res = await fetch(`${BASE_URL}/track/waybill?${params.toString()}`, {
      method: "POST",
      headers: { key: API_KEY },
      cache: "no-store",
    });
    const json = await res.json();

    if (!res.ok || json?.meta?.status === false || !json?.data) {
      return NextResponse.json(
        { error: json?.meta?.message ?? "Gagal melacak resi", data: null },
        { status: res.status === 404 ? 404 : 500 }
      );
    }
    return NextResponse.json({ data: json.data });
  } catch (err) {
    console.error("RajaOngkir track fetch error:", err);
    return NextResponse.json({ error: "Gagal melacak resi" }, { status: 500 });
  }
}