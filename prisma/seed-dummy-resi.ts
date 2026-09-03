import { prisma } from "@/lib/prisma"; 


const USER_ID = "11f9d4f8-2ad9-4c37-92ce-72373154a491";

async function main() {
  // Ambil 1 produk barang (bukan jasa) yang sudah ada, untuk dipakai di order_detail
  const produk = await prisma.produk.findFirst({
    where: { barang: { some: {} } },
  });

  if (!produk) {
    throw new Error(
      "Tidak ada produk barang di database. Buat minimal 1 produk dengan Barang dulu sebelum seed ini."
    );
  }

  const dataDummy = [
    {
      label: "Order sedang dikirim - resi AKAN terkonfirmasi sampai (angka akhir genap)",
      nomor_resi: "JNE00000002",
      status_order: "Dikirim" as const,
    },
    {
      label: "Order sedang dikirim - resi BELUM terkonfirmasi sampai (angka akhir ganjil)",
      nomor_resi: "JNE00000003",
      status_order: "Dikirim" as const,
    },
    {
      label: "Order sudah Diterima (masa tenggang refund, diterima 1 hari lalu)",
      nomor_resi: "JNE00000004",
      status_order: "Diterima" as const,
      diterima_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 hari lalu
    },
    {
      label: "Order sudah Diterima TAPI lewat masa tenggang (diterima 5 hari lalu, siap difinalisasi cron)",
      nomor_resi: "JNE00000006",
      status_order: "Diterima" as const,
      diterima_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 hari lalu
    },
  ];

  for (const d of dataDummy) {
    const kodeInvoice = `DUMMY-${d.nomor_resi}`;
    const harga = produk.harga;

    const order = await prisma.order.create({
      data: {
        user_id: USER_ID,
        kode_invoice: kodeInvoice,
        total_harga: harga,
        status_order: d.status_order,
        status_pembayaran: "Lunas",
        orderDetail: {
          create: {
            produk_id: produk.produk_id,
            jumlah: 1,
            harga_satuan: harga,
            subtotal: harga,
          },
        },
        pengiriman: {
          create: {
            nama_penerima: "Pembeli Dummy",
            alamat: "Jl. Testing No. 1, Lumajang, Jawa Timur",
            kurir: "JNE",
            ongkir: 15000,
            nomor_resi: d.nomor_resi,
            estimasi_tiba: "2-3 Hari",
            diterima_at: d.diterima_at ?? null,
          },
        },
      },
    });

    console.log(`✅ ${d.label} → order_id: ${order.order_id}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });