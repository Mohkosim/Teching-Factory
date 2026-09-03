import { prisma } from "@/lib/prisma";

const MASA_TENGGANG_HARI = 3;

export async function GET() {
  const batasWaktu = new Date();
  batasWaktu.setDate(batasWaktu.getDate() - MASA_TENGGANG_HARI);

  const tanpaRefund = await prisma.order.findMany({
    where: {
      status_order: "Diterima",
      pengiriman: { diterima_at: { lte: batasWaktu } },
      refundRequest: { is: null },
    },
    select: { order_id: true },
  });

  const refundDitolak = await prisma.order.findMany({
    where: {
      status_order: "Diterima",
      pengiriman: { diterima_at: { lte: batasWaktu } },
      refundRequest: { status: "Ditolak" },
    },
    select: { order_id: true },
  });

  const semuaKandidat = [...tanpaRefund, ...refundDitolak];

  for (const o of semuaKandidat) {
    await prisma.order.update({ where: { order_id: o.order_id }, data: { status_order: "Selesai" } });
    await prisma.pengiriman.update({ where: { order_id: o.order_id }, data: { auto_confirmed: true } });
  }

  return Response.json({ finalized: semuaKandidat.length });
}