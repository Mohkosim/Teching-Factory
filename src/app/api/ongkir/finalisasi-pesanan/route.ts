import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const MASA_TENGGANG_HARI = 3;

function otorisasiCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function jalankan() {
  const batasWaktu = new Date();
  batasWaktu.setDate(batasWaktu.getDate() - MASA_TENGGANG_HARI);

  const kandidat = await prisma.order.findMany({
    where: {
      status_order: "Diterima",
      pengiriman: { diterima_at: { lte: batasWaktu } },
      OR: [{ refundRequest: { is: null } }, { refundRequest: { status: "Ditolak" } }],
    },
    select: { order_id: true },
  });

  let finalized = 0;
  for (const o of kandidat) {

    const res = await prisma.order.updateMany({
      where: { order_id: o.order_id, status_order: "Diterima" },
      data: { status_order: "Selesai" },
    });
    if (res.count === 1) {
      await prisma.pengiriman.update({ where: { order_id: o.order_id }, data: { auto_confirmed: true } });
      const detail = await prisma.order_Detail.findMany({ where: { order_id: o.order_id }, select: { produk_id: true } });
      await prisma.jasa.updateMany({
        where: { produk_id: { in: detail.map((d) => d.produk_id) } },
        data: { total_project: { increment: 1 } },
      });
      finalized++;
    }
  }
  return finalized;
}


export async function POST(req: NextRequest) {
  if (!otorisasiCron(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ finalized: await jalankan() });
}
