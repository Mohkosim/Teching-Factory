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
  createdAt: Date;
  produk: ProdukInfo;
  order: OrderInfo;
}

function baseOrderDetail(overrides: Partial<OrderDetailItem> = {}): OrderDetailItem {
  return {
    order_detail_id: "od-1",
    order_id: "order-1",
    jumlah: 2,
    harga_satuan: 50_000,
    createdAt: new Date("2026-01-10"),
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

  it("totalPemasukan pada ringkasan hanya menjumlahkan baris berstatus Settled", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([
      baseOrderDetail(), // Settled, transaksi[0].nominal = 115_000
      baseOrderDetail({
        order_detail_id: "od-pending",
        order: {
          ...baseOrderDetail().order,
          status_pembayaran: "Menunggu_Konfirmasi",
          transaksi: [],
        },
      }),
    ]);
    transaksiFindMany.mockResolvedValue([]);

    const { ringkasan } = await getLaporanKeuanganData("jurusan-1");
    expect(ringkasan.totalPemasukan).toBe(115_000);
  });

  it("hpp pada ringkasan hanya menjumlahkan pengeluaran berkategori 'Bahan Baku'", async () => {
    const orderDetailFindMany = prisma.order_Detail.findMany as unknown as FindManyMock;
    const transaksiFindMany = prisma.transaksi.findMany as unknown as FindManyMock;

    orderDetailFindMany.mockResolvedValue([]);
    transaksiFindMany.mockResolvedValue([
      {
        transaksi_id: "t-1",
        tanggal_transaksi: new Date("2026-01-05"),
        nama: "Toko Kayu",
        user: { name: "Admin" },
        kategori: "Bahan Baku",
        deskripsi: "Beli kayu",
        nominal: 200_000,
        metode: "Tunai",
        status_settlement: "Selesai",
        bukti: null,
      },
      {
        transaksi_id: "t-2",
        tanggal_transaksi: new Date("2026-01-06"),
        nama: "PLN",
        user: { name: "Admin" },
        kategori: "Operasional",
        deskripsi: "Listrik",
        nominal: 100_000,
        metode: "Tunai",
        status_settlement: "Selesai",
        bukti: null,
      },
    ]);

    const { ringkasan } = await getLaporanKeuanganData("jurusan-1");
    expect(ringkasan.hpp).toBe(200_000);
    expect(ringkasan.totalPengeluaran).toBe(300_000);
  });
});