import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order_Detail: { findMany: vi.fn() },
    transaksi: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getLaporanKeuanganData } from "@/lib/data/laporan-keuangan";

type FindManyMock = ReturnType<typeof vi.fn>;

interface AlamatItem {
  isUtama: boolean;
  nomor_telepon: string;
  alamat_lengkap: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
}

interface UserInfo {
  name: string;
  email: string;
  alamat: AlamatItem[];
}

interface PengirimanInfo {
  ongkir: number;
  kurir: string;
  nomor_resi: string;
  estimasi_tiba: string;
}

interface RefundRequestInfo {
  status: string;
  alasan: string;
  updatedAt?: Date;
}

interface TransaksiItem {
  nominal: number;
  metode: string;
  biaya_midtrans: number;
}

interface OrderInfo {
  order_id: string;
  kode_invoice: string | null;
  status_pembayaran: string;
  user: UserInfo;
  pengiriman: PengirimanInfo;
  refundRequest: RefundRequestInfo | null;
  transaksi: TransaksiItem[];
}

interface KombinasiInfo {
  opsi: { opsi: { nama: string } }[];
}

interface ProdukInfo {
  nama_produk: string;
  foto: { url: string }[];
  jasa: { jasa_id: string }[];
}

interface OrderDetailItem {
  order_detail_id: string;
  order_id: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  createdAt: Date;
  kombinasi?: KombinasiInfo | null;
  produk: ProdukInfo;
  order: OrderInfo;
}

function baseOrderDetail(overrides: Partial<OrderDetailItem> = {}): OrderDetailItem {
  return {
    order_detail_id: "od-1",
    order_id: "order-1",
    jumlah: 2,
    harga_satuan: 50_000,
    subtotal: 100_000,
    createdAt: new Date("2026-01-10"),
    kombinasi: null,
    produk: {
      nama_produk: "Kursi Kayu",
      foto: [{ url: "https://img/1.jpg" }],
      jasa: [], // kosong -> kategori "Produk"
    },
    order: {
      order_id: "order-1",
      kode_invoice: "INV-20260110-ABC123",
      status_pembayaran: "Lunas",
      user: {
        name: "Budi",
        email: "budi@example.com",
        alamat: [
          {
            isUtama: true,
            nomor_telepon: "0812xxxx",
            alamat_lengkap: "Jl. Mawar",
            kecamatan: "Lumajang",
            kota: "Lumajang",
            provinsi: "Jawa Timur",
          },
        ],
      },
      pengiriman: { ongkir: 15_000, kurir: "JNE - REG", nomor_resi: "JNE123", estimasi_tiba: "2 hari" },
      refundRequest: null,
      transaksi: [{ nominal: 115_000, metode: "Transfer", biaya_midtrans: 4440 }],
    },
    ...overrides,
  };
}

describe("getLaporanKeuanganData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mengkategorikan baris sebagai 'Jasa' jika produk punya relasi jasa, selain itu 'Produk'", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail(),
      baseOrderDetail({
        order_detail_id: "od-2",
        produk: { nama_produk: "Servis AC", foto: [], jasa: [{ jasa_id: "j-1" }] },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");
    const pemasukanRows = transaksi.filter((r) => r.jenisTransaksi === "Pemasukan");

    expect(pemasukanRows[0].kategori).toBe("Produk");
    expect(pemasukanRows[1].kategori).toBe("Jasa");
  });

  it("status refund yang masih aktif (bukan Ditolak) meng-override status Settled menjadi Refund", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({
        order: {
          ...baseOrderDetail().order,
          refundRequest: { status: "Diajukan", alasan: "Barang rusak" },
        },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");
    expect(transaksi[0].statusSettlement).toBe("Refund");
  });

  it("refund berstatus Ditolak TIDAK dianggap aktif, status settlement kembali mengikuti status_pembayaran", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({
        order: {
          ...baseOrderDetail().order,
          status_pembayaran: "Lunas",
          refundRequest: { status: "Ditolak", alasan: "Tidak memenuhi syarat" },
        },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");
    expect(transaksi[0].statusSettlement).toBe("Settled");
  });

  it("noInvoice fallback ke order_id ketika kode_invoice null", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({ order: { ...baseOrderDetail().order, kode_invoice: null } }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");
    expect(transaksi[0].noInvoice).toBe("order-1");
  });

  it("total baris pemasukan memakai subtotal item (bukan nominal pembayaran seluruh Order), beserta qty & harga satuan", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    // Order berisi 2 item; pembayaran Order = 215.000, tapi item ini hanya 100.000.
    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({
        subtotal: 100_000,
        order: {
          ...baseOrderDetail().order,
          transaksi: [{ nominal: 215_000, metode: "Transfer", biaya_midtrans: 4440 }],
        },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");

    expect(transaksi[0]).toMatchObject({
      jenisTransaksi: "Pemasukan",
      total: 100_000,
      qty: 2,
      hargaSatuan: 50_000,
    });
  });

  it("status_pembayaran selain 'Lunas' (tanpa refund) -> statusSettlement 'Pending'", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({
        order: { ...baseOrderDetail().order, status_pembayaran: "Menunggu_Konfirmasi", transaksi: [] },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");

    expect(transaksi[0].statusSettlement).toBe("Pending");
    expect(transaksi[0].metodePembayaran).toBe("-"); // belum ada pembayaran -> metode "-"
    expect(transaksi[0].biayaMidtrans).toBe(0);
  });

  it("metode pembayaran, biaya Midtrans, & ongkir diambil dari transaksi dan pengiriman Order", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([baseOrderDetail()]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");

    expect(transaksi[0]).toMatchObject({
      metodePembayaran: "Transfer",
      biayaMidtrans: 4440,
      biayaOngkir: 15_000,
      pengiriman: { kurir: "JNE - REG", nomorResi: "JNE123", estimasi: "2 hari" },
    });
  });

  it("refund yang masih diproses (Diajukan) tetap dicatat sebagai Pemasukan berstatus Refund — belum jadi pengeluaran", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({
        order: {
          ...baseOrderDetail().order,
          refundRequest: { status: "Diajukan", alasan: "Barang rusak" },
        },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");

    expect(transaksi[0].jenisTransaksi).toBe("Pemasukan");
    expect(transaksi[0].statusSettlement).toBe("Refund");
    expect(transaksi[0].refund).toEqual({ status: "Diajukan", alasan: "Barang rusak" });
  });

  it("refund yang DISETUJUI dicatat sebagai PENGELUARAN (uang dikembalikan ke pembeli), bertanggal saat refund disetujui", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    const tanggalRefund = new Date("2026-02-20");
    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({
        createdAt: new Date("2026-01-10"),
        order: {
          ...baseOrderDetail().order,
          refundRequest: { status: "Disetujui", alasan: "Barang rusak", updatedAt: tanggalRefund },
        },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");

    expect(transaksi[0].jenisTransaksi).toBe("Pengeluaran");
    expect(transaksi[0].statusSettlement).toBe("Refund");
    expect(transaksi[0].tanggal).toBe(tanggalRefund.toLocaleDateString("id-ID"));
    expect(transaksi[0].total).toBe(100_000); // nilai item yang dikembalikan
  });

  it("varian produk ditampilkan sebagai label gabungan nama opsi; produk tanpa varian -> undefined", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({
        order_detail_id: "od-varian",
        kombinasi: { opsi: [{ opsi: { nama: "Coklat" } }, { opsi: { nama: "Besar" } }] },
      }),
      baseOrderDetail({ order_detail_id: "od-polos", kombinasi: null }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");
    const varian = transaksi.find((r) => r.id === "masuk-od-varian");
    const polos = transaksi.find((r) => r.id === "masuk-od-polos");

    expect(varian?.varianLabel).toBe("Coklat, Besar");
    expect(polos?.varianLabel).toBeUndefined();
  });

  it("data pembeli memakai alamat utama; jika tidak ada alamat utama pakai alamat pertama; tanpa alamat -> undefined", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    const alamatBiasa: AlamatItem = {
      isUtama: false,
      nomor_telepon: "0811-biasa",
      alamat_lengkap: "Jl. Melati",
      kecamatan: "Sukodono",
      kota: "Lumajang",
      provinsi: "Jawa Timur",
    };
    const alamatUtama: AlamatItem = { ...alamatBiasa, isUtama: true, nomor_telepon: "0822-utama", alamat_lengkap: "Jl. Mawar" };
    const orderDasar = baseOrderDetail().order;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({
        order_detail_id: "od-utama",
        order: { ...orderDasar, user: { ...orderDasar.user, alamat: [alamatBiasa, alamatUtama] } },
      }),
      baseOrderDetail({
        order_detail_id: "od-pertama",
        order: { ...orderDasar, user: { ...orderDasar.user, alamat: [alamatBiasa] } },
      }),
      baseOrderDetail({
        order_detail_id: "od-kosong",
        order: { ...orderDasar, user: { ...orderDasar.user, alamat: [] } },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");
    const byId = (id: string) => transaksi.find((r) => r.id === `masuk-${id}`);

    expect(byId("od-utama")?.pembeli?.nomor).toBe("0822-utama");
    expect(byId("od-pertama")?.pembeli?.nomor).toBe("0811-biasa");
    expect(byId("od-kosong")?.pembeli).toBeUndefined();
  });

  it("data diambil hanya untuk jurusan yang diminta (pemasukan lewat produk.jurusan_id; pengeluaran manual tanpa order)", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([]);
    transaksiFindMany.mockResolvedValue([]);

    await getLaporanKeuanganData("jurusan-A");

    expect(orderDetailFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { produk: { jurusan_id: "jurusan-A" } } })
    );
    expect(transaksiFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jurusan_id: "jurusan-A", jenis_transaksi: "Pengeluaran", order_id: null },
      })
    );
  });

  it("pengeluaran manual dipetakan jadi baris Pengeluaran: kategori, nominal, nama pemasok, no. PNG-, status Selesai -> Settled", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([]);
    transaksiFindMany.mockResolvedValue([
      {
        transaksi_id: "abcd1234-xxxx",
        tanggal_transaksi: new Date("2026-01-05"),
        nama: "Toko Kayu",
        user: { name: "Admin" },
        kategori: "Bahan Baku",
        deskripsi: "Beli kayu",
        nominal: 200_000,
        metode: "Tunai",
        status_settlement: "Selesai",
        bukti: "bukti.jpg",
      },
      {
        transaksi_id: "efgh5678-xxxx",
        tanggal_transaksi: new Date("2026-01-06"),
        nama: null, // nama pemasok kosong -> pakai nama admin pencatat
        user: { name: "Admin Jurusan" },
        kategori: null, // kategori kosong -> default "Operasional"
        deskripsi: null,
        nominal: 100_000,
        metode: null,
        status_settlement: "Menunggu",
        bukti: null,
      },
    ]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");
    const bahanBaku = transaksi.find((r) => r.id === "keluar-abcd1234-xxxx");
    const default_ = transaksi.find((r) => r.id === "keluar-efgh5678-xxxx");

    expect(bahanBaku).toMatchObject({
      jenisTransaksi: "Pengeluaran",
      noInvoice: "PNG-ABCD1234",
      pembeliPemasok: "Toko Kayu",
      kategori: "Bahan Baku",
      total: 200_000,
      metodePembayaran: "Tunai",
      statusSettlement: "Settled",
      gambarUrl: "bukti.jpg",
    });
    expect(default_).toMatchObject({
      pembeliPemasok: "Admin Jurusan",
      kategori: "Operasional",
      deskripsi: "",
      metodePembayaran: "-",
      statusSettlement: "Pending",
    });
  });

  it("pemasukan & pengeluaran digabung dalam satu daftar, diurutkan dari tanggal TERBARU ke terlama", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail({ order_detail_id: "od-tgl-10", createdAt: new Date("2026-01-10") }),
    ]);
    transaksiFindMany.mockResolvedValue([
      {
        transaksi_id: "t-lama",
        tanggal_transaksi: new Date("2026-01-02"),
        nama: "A",
        user: { name: "Admin" },
        kategori: "Operasional",
        deskripsi: "",
        nominal: 1_000,
        metode: "Tunai",
        status_settlement: "Selesai",
        bukti: null,
      },
      {
        transaksi_id: "t-baru",
        tanggal_transaksi: new Date("2026-01-20"),
        nama: "B",
        user: { name: "Admin" },
        kategori: "Operasional",
        deskripsi: "",
        nominal: 2_000,
        metode: "Tunai",
        status_settlement: "Selesai",
        bukti: null,
      },
    ]);

    const { transaksi } = await getLaporanKeuanganData("jurusan-1");

    expect(transaksi.map((r) => r.id)).toEqual(["keluar-t-baru", "masuk-od-tgl-10", "keluar-t-lama"]);
  });

  it("hasilnya hanya berisi daftar transaksi (ringkasan/laba dihitung terpisah oleh mesin akuntansi, bukan di sini)", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([]);
    transaksiFindMany.mockResolvedValue([]);

    const hasil = await getLaporanKeuanganData("jurusan-1");

    expect(Object.keys(hasil)).toEqual(["transaksi"]);
  });
});