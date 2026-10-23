import { NextRequest, NextResponse } from "next/server";
import { hitungTarifJurusan } from "@/lib/ongkir/tarif";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = await rateLimit(`cost:${session.user.id}`, 60, 60 * 1000);
  if (!limit.success) {
    return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const originId = Number(body.originId);
  const destinationId = Number(body.destinationId);
  const weight = Number(body.weight);
  const jurusanId = typeof body.jurusanId === "string" ? body.jurusanId : "";

  if (
    !Number.isInteger(originId) || originId <= 0 ||
    !Number.isInteger(destinationId) || destinationId <= 0 ||
    !Number.isInteger(weight) || weight <= 0 || weight > 100_000 ||
    !jurusanId
  ) {
    return NextResponse.json(
      { error: "originId, destinationId, weight, dan jurusanId wajib diisi dengan benar" },
      { status: 400 }
    );
  }

  try {
    const hasil = await hitungTarifJurusan({ originId, destinationId, weight, jurusanId });

    if (hasil.tanpaKurirAktif) {
      return NextResponse.json(
        { error: "Jurusan ini belum mengaktifkan kurir pengiriman apapun", data: [] },
        { status: 200 }
      );
    }

    if (hasil.semuaGagal) {
      return NextResponse.json(
        {
          error: "Semua kurir gagal dihitung. Cek origin/destination id atau kuota API.",
          details: hasil.errors,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: hasil.data });
  } catch (err) {
    console.error("RajaOngkir cost error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data ongkos kirim" },
      { status: 500 }
    );
  }
}
