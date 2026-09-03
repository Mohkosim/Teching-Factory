"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { mapKodeKurir } from "@/lib/utils/kurir-map";

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const API_KEY = process.env.RAJAONGKIR_API_KEY!;

export async function cekStatusResiAction(order_id: string) {
  const pengiriman = await prisma.pengiriman.findUnique({ where: { order_id } });
  if (!pengiriman?.nomor_resi) throw new Error("Nomor resi belum tersedia");

  const kodeKurir = mapKodeKurir(pengiriman.kurir);
  const params = new URLSearchParams({ awb: pengiriman.nomor_resi, courier: kodeKurir });

  const res = await fetch(`${BASE_URL}/track/waybill?${params.toString()}`, {
    method: "POST",
    headers: { key: API_KEY },
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || !json?.data) return { delivered: false, status: "UNKNOWN" };

  const status = json.data.delivery_status?.status ?? json.data.summary?.status ?? "UNKNOWN";
  const delivered = Boolean(json.data.delivered);

  await prisma.pengiriman.update({
    where: { order_id },
    data: { status_resi: status, cek_terakhir_at: new Date() },
  });

  const order = await prisma.order.findUnique({ where: { order_id }, select: { status_order: true } });
  if (delivered && order?.status_order === "Dikirim") {
    await prisma.order.update({ where: { order_id }, data: { status_order: "Diterima" } });
    await prisma.pengiriman.update({ where: { order_id }, data: { diterima_at: new Date() } });
    revalidatePath("/profile/pesanan");
  }

  return { delivered, status };
}