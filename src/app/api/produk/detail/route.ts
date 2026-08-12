import { NextRequest, NextResponse } from "next/server";
import { getProdukDetailById, getProdukRekomendasi } from "@/lib/data/produk-public";

export async function POST(req: NextRequest) {
  const { id } = await req.json();

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const produk = await getProdukDetailById(id);

  if (!produk) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  }

  const rekomendasi = await getProdukRekomendasi(id);

  return NextResponse.json({ produk, rekomendasi });
}