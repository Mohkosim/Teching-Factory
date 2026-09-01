import { prisma } from "@/lib/prisma";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
];

export async function getSmkIdByUser(userId: string) {
  const smk = await prisma.sMK.findUnique({
    where: { user_id: userId },
    select: { smk_id: true },
  });
  return smk?.smk_id ?? null;
}

// Statistic penjualan per jurusan (produk & jasa dipisah, digabung di client sesuai filter)
export async function getStatistikPenjualanJurusan(smk_id: string) {
  const jurusans = await prisma.jurusan.findMany({
    where: { smk_id },
    select: {
      jurusan_id: true,
      nama_jurusan: true,
      produk: {
        select: {
          jasa: { select: { jasa_id: true } },
          barang: { select: { barang_id: true } },
          orderDetail: {
            where: { order: { status_order: "Selesai" } },
            select: { subtotal: true },
          },
        },
      },
    },
  });

  return jurusans.map((j) => {
    let produk = 0;
    let jasa = 0;
    for (const p of j.produk) {
      const total = p.orderDetail.reduce((s, o) => s + o.subtotal, 0);
      if (p.jasa.length > 0) jasa += total;
      else produk += total;
    }
    return { jurusan: j.nama_jurusan, produk, jasa };
  });
}

// Proporsi Produk vs Jasa (donut)
export async function getProdukJasaProportion(smk_id: string) {
  const statistik = await getStatistikPenjualanJurusan(smk_id);
  const totalProduk = statistik.reduce((s, j) => s + j.produk, 0);
  const totalJasa = statistik.reduce((s, j) => s + j.jasa, 0);
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

// Tren bulanan (7 bulan terakhir) untuk "produk" atau "jasa"
export async function getMonthlyTrend(smk_id: string, tipe: "produk" | "jasa") {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const details = await prisma.order_Detail.findMany({
    where: {
      createdAt: { gte: start },
      order: { status_order: "Selesai" },
      produk: {
        jurusan: { smk_id },
        ...(tipe === "jasa"
          ? { jasa: { some: {} } }
          : { barang: { some: {} } }),
      },
    },
    select: { subtotal: true, createdAt: true },
  });

  const months: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${MONTH_LABELS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
    });
  }

  const totals = new Map(months.map((m) => [m.key, 0]));
  for (const d of details) {
    const key = `${d.createdAt.getFullYear()}-${d.createdAt.getMonth()}`;
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + d.subtotal);
  }

  return months.map((m) => ({ bulan: m.label, nilai: totals.get(m.key) ?? 0 }));
}