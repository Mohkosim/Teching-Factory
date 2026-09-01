import { prisma } from "@/lib/prisma";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
];

function getMonthlyBuckets() {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${MONTH_LABELS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
    });
  }
  return months;
}

export async function getJurusanIdByUser(userId: string) {
  const jurusan = await prisma.jurusan.findUnique({
    where: { user_id: userId },
    select: { jurusan_id: true },
  });
  return jurusan?.jurusan_id ?? null;
}

export async function getProdukJasaProportionJurusan(jurusan_id: string) {
  const produkList = await prisma.produk.findMany({
    where: { jurusan_id },
    select: {
      jasa: { select: { jasa_id: true } },
      orderDetail: {
        where: { order: { status_order: "Selesai" } },
        select: { subtotal: true },
      },
    },
  });

  let totalProduk = 0;
  let totalJasa = 0;
  for (const p of produkList) {
    const total = p.orderDetail.reduce((s, o) => s + o.subtotal, 0);
    if (p.jasa.length > 0) totalJasa += total;
    else totalProduk += total;
  }

  const grandTotal = totalProduk + totalJasa;
  if (grandTotal === 0) {
    return [
      { name: "Produk", value: 0, color: "#ef4444" },
      { name: "Jasa", value: 0, color: "#22d3ee" },
    ];
  }

  return [
    { name: "Produk", value: Math.round((totalProduk / grandTotal) * 100), color: "#ef4444" },
    { name: "Jasa", value: Math.round((totalJasa / grandTotal) * 100), color: "#22d3ee" },
  ];
}

// Pendapatan bulanan (7 bulan terakhir), dipecah semua/produk/jasa
export async function getPendapatanBulanan(jurusan_id: string) {
  const months = getMonthlyBuckets();
  const start = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 6,
    1
  );

  const details = await prisma.order_Detail.findMany({
    where: {
      createdAt: { gte: start },
      order: { status_order: "Selesai" },
      produk: { jurusan_id },
    },
    select: {
      subtotal: true,
      createdAt: true,
      produk: { select: { jasa: { select: { jasa_id: true } } } },
    },
  });

  const semua = new Map(months.map((m) => [m.key, 0]));
  const produk = new Map(months.map((m) => [m.key, 0]));
  const jasa = new Map(months.map((m) => [m.key, 0]));

  for (const d of details) {
    const key = `${d.createdAt.getFullYear()}-${d.createdAt.getMonth()}`;
    if (!semua.has(key)) continue;
    semua.set(key, (semua.get(key) ?? 0) + d.subtotal);
    if (d.produk.jasa.length > 0) jasa.set(key, (jasa.get(key) ?? 0) + d.subtotal);
    else produk.set(key, (produk.get(key) ?? 0) + d.subtotal);
  }

  const toArr = (m: Map<string, number>) =>
    months.map((mo) => ({ bulan: mo.label, nilai: m.get(mo.key) ?? 0 }));

  return { semua: toArr(semua), produk: toArr(produk), jasa: toArr(jasa) };
}

// Jumlah pesanan bulanan (7 bulan terakhir), dipecah semua/produk/jasa
export async function getPesananBulanan(jurusan_id: string) {
  const months = getMonthlyBuckets();
  const start = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 6,
    1
  );

  const details = await prisma.order_Detail.findMany({
    where: {
      createdAt: { gte: start },
      produk: { jurusan_id },
    },
    select: {
      createdAt: true,
      produk: { select: { jasa: { select: { jasa_id: true } } } },
    },
  });

  const semua = new Map(months.map((m) => [m.key, 0]));
  const produk = new Map(months.map((m) => [m.key, 0]));
  const jasa = new Map(months.map((m) => [m.key, 0]));

  for (const d of details) {
    const key = `${d.createdAt.getFullYear()}-${d.createdAt.getMonth()}`;
    if (!semua.has(key)) continue;
    semua.set(key, (semua.get(key) ?? 0) + 1);
    if (d.produk.jasa.length > 0) jasa.set(key, (jasa.get(key) ?? 0) + 1);
    else produk.set(key, (produk.get(key) ?? 0) + 1);
  }

  const toArr = (m: Map<string, number>) =>
    months.map((mo) => ({ bulan: mo.label, nilai: m.get(mo.key) ?? 0 }));

  return { semua: toArr(semua), produk: toArr(produk), jasa: toArr(jasa) };
}