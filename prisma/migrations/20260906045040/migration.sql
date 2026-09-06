-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Laki_laki', 'Perempuan');

-- CreateEnum
CREATE TYPE "KategoriGaleri" AS ENUM ('Pameran', 'Lomba', 'Pelatihan', 'Kunjungan');

-- CreateEnum
CREATE TYPE "StatusProduk" AS ENUM ('Tersedia', 'Habis', 'Nonaktif');

-- CreateEnum
CREATE TYPE "StatusPublikasi" AS ENUM ('Pending', 'Published', 'Revisi');

-- CreateEnum
CREATE TYPE "StatusPesan" AS ENUM ('Baru', 'Dibaca', 'Dibalas');

-- CreateEnum
CREATE TYPE "StatusOrder" AS ENUM ('Menunggu', 'Diproses', 'Dikirim', 'Diterima', 'Selesai', 'Dibatalkan');

-- CreateEnum
CREATE TYPE "StatusPembayaran" AS ENUM ('Belum_Bayar', 'Menunggu_Konfirmasi', 'Lunas', 'Gagal');

-- CreateEnum
CREATE TYPE "JenisTransaksi" AS ENUM ('Pemasukan', 'Pengeluaran');

-- CreateEnum
CREATE TYPE "StatusSettlementTransaksi" AS ENUM ('Selesai', 'Menunggu', 'Gagal', 'Dibatalkan', 'Dikembalikan');

-- CreateEnum
CREATE TYPE "StatusPenarikan" AS ENUM ('Pending', 'Diproses', 'Selesai', 'Ditolak');

-- CreateEnum
CREATE TYPE "MetodePembayaran" AS ENUM ('Transfer', 'Tunai', 'COD', 'QRIS', 'E_Wallet');

-- CreateEnum
CREATE TYPE "StatusRefund" AS ENUM ('Diajukan', 'Diproses', 'Disetujui', 'Ditolak');

-- CreateEnum
CREATE TYPE "TipeBuktiRefund" AS ENUM ('Foto', 'Video');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SMK" (
    "smk_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kepala_sekolah" TEXT,
    "deskripsi" TEXT,
    "alamat" TEXT NOT NULL,
    "kecamatan" TEXT,
    "kota" TEXT NOT NULL,
    "kota_id" INTEGER,
    "kode_pos" TEXT,
    "provinsi" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "tahun_berdiri" INTEGER NOT NULL,
    "status_verifikasi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMK_pkey" PRIMARY KEY ("smk_id")
);

-- CreateTable
CREATE TABLE "Jurusan" (
    "jurusan_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "smk_id" TEXT NOT NULL,
    "nama_jurusan" TEXT NOT NULL,
    "deskripsi" TEXT,
    "kepala_jurusan" TEXT,
    "jam_operasional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jurusan_pkey" PRIMARY KEY ("jurusan_id")
);

-- CreateTable
CREATE TABLE "Alamat" (
    "alamat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nama_penerima" TEXT NOT NULL,
    "nomor_telepon" TEXT NOT NULL,
    "alamat_lengkap" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kode_pos" TEXT NOT NULL,
    "kota_id" INTEGER,
    "isUtama" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alamat_pkey" PRIMARY KEY ("alamat_id")
);

-- CreateTable
CREATE TABLE "Produk" (
    "produk_id" TEXT NOT NULL,
    "jurusan_id" TEXT NOT NULL,
    "nama_produk" TEXT NOT NULL,
    "deskripsi" TEXT,
    "harga" INTEGER NOT NULL,
    "status" "StatusProduk" NOT NULL DEFAULT 'Tersedia',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "status_publikasi" "StatusPublikasi" NOT NULL DEFAULT 'Pending',
    "catatan_revisi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produk_pkey" PRIMARY KEY ("produk_id")
);

-- CreateTable
CREATE TABLE "FotoProduk" (
    "foto_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoProduk_pkey" PRIMARY KEY ("foto_id")
);

-- CreateTable
CREATE TABLE "Barang" (
    "barang_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "kondisi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barang_pkey" PRIMARY KEY ("barang_id")
);

-- CreateTable
CREATE TABLE "Jasa" (
    "jasa_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "nama_jasa" TEXT NOT NULL,
    "estimasi_pengerjaan" TEXT,
    "total_project" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jasa_pkey" PRIMARY KEY ("jasa_id")
);

-- CreateTable
CREATE TABLE "Portofolio" (
    "portofolio_id" TEXT NOT NULL,
    "jasa_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portofolio_pkey" PRIMARY KEY ("portofolio_id")
);

-- CreateTable
CREATE TABLE "Review" (
    "review_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "order_detail_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "komentar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "FotoReview" (
    "foto_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoReview_pkey" PRIMARY KEY ("foto_id")
);

-- CreateTable
CREATE TABLE "Galeri" (
    "galeri_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "kategori" "KategoriGaleri" NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Galeri_pkey" PRIMARY KEY ("galeri_id")
);

-- CreateTable
CREATE TABLE "TentangTefa" (
    "tentang_id" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "videoLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TentangTefa_pkey" PRIMARY KEY ("tentang_id")
);

-- CreateTable
CREATE TABLE "TentangTefaFoto" (
    "foto_id" TEXT NOT NULL,
    "tentang_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentangTefaFoto_pkey" PRIMARY KEY ("foto_id")
);

-- CreateTable
CREATE TABLE "Pesan" (
    "pesan_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT 'Tidak ada nomor',
    "pesan" TEXT NOT NULL,
    "status" "StatusPesan" NOT NULL DEFAULT 'Baru',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pesan_pkey" PRIMARY KEY ("pesan_id")
);

-- CreateTable
CREATE TABLE "Order" (
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kode_invoice" TEXT,
    "total_harga" INTEGER NOT NULL,
    "status_order" "StatusOrder" NOT NULL DEFAULT 'Menunggu',
    "status_pembayaran" "StatusPembayaran" NOT NULL DEFAULT 'Belum_Bayar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "Order_Detail" (
    "order_detail_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "harga_satuan" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_Detail_pkey" PRIMARY KEY ("order_detail_id")
);

-- CreateTable
CREATE TABLE "Transaksi" (
    "transaksi_id" TEXT NOT NULL,
    "order_id" TEXT,
    "user_id" TEXT NOT NULL,
    "jurusan_id" TEXT,
    "tanggal_transaksi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jenis_transaksi" "JenisTransaksi" NOT NULL,
    "kategori" TEXT,
    "nama" TEXT,
    "deskripsi" TEXT,
    "nominal" INTEGER NOT NULL,
    "bukti" TEXT,
    "metode" "MetodePembayaran",
    "kode_pembayaran" TEXT,
    "biaya_midtrans" INTEGER DEFAULT 0,
    "status_settlement" "StatusSettlementTransaksi" NOT NULL DEFAULT 'Selesai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaksi_pkey" PRIMARY KEY ("transaksi_id")
);

-- CreateTable
CREATE TABLE "PenarikanSaldo" (
    "penarikan_id" TEXT NOT NULL,
    "jurusan_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "nama_bank" TEXT NOT NULL,
    "nomor_rekening" TEXT NOT NULL,
    "atas_nama" TEXT NOT NULL,
    "status" "StatusPenarikan" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenarikanSaldo_pkey" PRIMARY KEY ("penarikan_id")
);

-- CreateTable
CREATE TABLE "Pengiriman" (
    "pengiriman_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "nama_penerima" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "kurir" TEXT NOT NULL,
    "ongkir" INTEGER NOT NULL,
    "nomor_resi" TEXT,
    "estimasi_tiba" TEXT,
    "status_resi" TEXT,
    "cek_terakhir_at" TIMESTAMP(3),
    "diterima_at" TIMESTAMP(3),
    "auto_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengiriman_pkey" PRIMARY KEY ("pengiriman_id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "produkId" TEXT,
    "jasaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KurirAktif" (
    "kurir_aktif_id" TEXT NOT NULL,
    "jurusan_id" TEXT NOT NULL,
    "kode_kurir" TEXT NOT NULL,
    "nama_kurir" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KurirAktif_pkey" PRIMARY KEY ("kurir_aktif_id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
    "refund_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "status" "StatusRefund" NOT NULL DEFAULT 'Diajukan',
    "catatanAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("refund_id")
);

-- CreateTable
CREATE TABLE "RefundBukti" (
    "bukti_id" TEXT NOT NULL,
    "refund_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipe" "TipeBuktiRefund" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundBukti_pkey" PRIMARY KEY ("bukti_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SMK_user_id_key" ON "SMK"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Jurusan_user_id_key" ON "Jurusan"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Review_order_detail_id_key" ON "Review"("order_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "Order_Detail_order_id_produk_id_key" ON "Order_Detail"("order_id", "produk_id");

-- CreateIndex
CREATE UNIQUE INDEX "Pengiriman_order_id_key" ON "Pengiriman"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_produkId_key" ON "Favorite"("userId", "produkId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_jasaId_key" ON "Favorite"("userId", "jasaId");

-- CreateIndex
CREATE UNIQUE INDEX "KurirAktif_jurusan_id_kode_kurir_key" ON "KurirAktif"("jurusan_id", "kode_kurir");

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequest_order_id_key" ON "RefundRequest"("order_id");

-- AddForeignKey
ALTER TABLE "SMK" ADD CONSTRAINT "SMK_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jurusan" ADD CONSTRAINT "Jurusan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jurusan" ADD CONSTRAINT "Jurusan_smk_id_fkey" FOREIGN KEY ("smk_id") REFERENCES "SMK"("smk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alamat" ADD CONSTRAINT "Alamat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_jurusan_id_fkey" FOREIGN KEY ("jurusan_id") REFERENCES "Jurusan"("jurusan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoProduk" ADD CONSTRAINT "FotoProduk_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "Produk"("produk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barang" ADD CONSTRAINT "Barang_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "Produk"("produk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jasa" ADD CONSTRAINT "Jasa_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "Produk"("produk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portofolio" ADD CONSTRAINT "Portofolio_jasa_id_fkey" FOREIGN KEY ("jasa_id") REFERENCES "Jasa"("jasa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "Produk"("produk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_order_detail_id_fkey" FOREIGN KEY ("order_detail_id") REFERENCES "Order_Detail"("order_detail_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoReview" ADD CONSTRAINT "FotoReview_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("review_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Galeri" ADD CONSTRAINT "Galeri_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentangTefaFoto" ADD CONSTRAINT "TentangTefaFoto_tentang_id_fkey" FOREIGN KEY ("tentang_id") REFERENCES "TentangTefa"("tentang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_Detail" ADD CONSTRAINT "Order_Detail_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_Detail" ADD CONSTRAINT "Order_Detail_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "Produk"("produk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("order_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_jurusan_id_fkey" FOREIGN KEY ("jurusan_id") REFERENCES "Jurusan"("jurusan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenarikanSaldo" ADD CONSTRAINT "PenarikanSaldo_jurusan_id_fkey" FOREIGN KEY ("jurusan_id") REFERENCES "Jurusan"("jurusan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenarikanSaldo" ADD CONSTRAINT "PenarikanSaldo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengiriman" ADD CONSTRAINT "Pengiriman_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("produk_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_jasaId_fkey" FOREIGN KEY ("jasaId") REFERENCES "Jasa"("jasa_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KurirAktif" ADD CONSTRAINT "KurirAktif_jurusan_id_fkey" FOREIGN KEY ("jurusan_id") REFERENCES "Jurusan"("jurusan_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundBukti" ADD CONSTRAINT "RefundBukti_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "RefundRequest"("refund_id") ON DELETE CASCADE ON UPDATE CASCADE;
