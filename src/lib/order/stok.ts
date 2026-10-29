import "server-only";
import type { PrismaTx } from "@/lib/prisma";
import { computeStatusProduk } from "@/lib/utils/status-produk";

type Tx = PrismaTx;

export async function kurangiStokAtomic(
    tx: Tx,
    item: { produkId: string; jumlah: number; kombinasiId?: string | null }
) {
    const { produkId, jumlah, kombinasiId } = item;

    const barang = await tx.barang.findFirst({ where: { produk_id: produkId }, select: { barang_id: true } });
    if (!barang) throw new Error(`STOK_HABIS:${produkId}`);

    if (kombinasiId) {
        const v = await tx.varianKombinasi.updateMany({
            where: { kombinasi_id: kombinasiId, produk_id: produkId, aktif: true, stok: { gte: jumlah } },
            data: { stok: { decrement: jumlah } },
        });
        if (v.count !== 1) throw new Error(`STOK_HABIS:${produkId}`);
    }

    const b = await tx.barang.updateMany({
        where: { barang_id: barang.barang_id, stok: { gte: jumlah } },
        data: { stok: { decrement: jumlah } },
    });
    if (b.count !== 1) throw new Error(`STOK_HABIS:${produkId}`);

    await sinkronStatusProduk(tx, produkId);
}

export async function kembalikanStok(
    tx: Tx,
    item: { produkId: string; jumlah: number; kombinasiId?: string | null }
) {
    const { produkId, jumlah, kombinasiId } = item;
    if (kombinasiId) {
        const kombinasi = await tx.varianKombinasi.findUnique({
            where: { kombinasi_id: kombinasiId },
            select: { aktif: true },
        });
        await tx.varianKombinasi.updateMany({
            where: { kombinasi_id: kombinasiId },
            data: { stok: { increment: jumlah } },
        });
        if (kombinasi && !kombinasi.aktif) return;
    }
    const barang = await tx.barang.findFirst({ where: { produk_id: produkId }, select: { barang_id: true } });
    if (barang) {
        await tx.barang.update({ where: { barang_id: barang.barang_id }, data: { stok: { increment: jumlah } } });
    }
    await sinkronStatusProduk(tx, produkId);
}

export async function sinkronStatusProduk(tx: Tx, produkId: string) {
    const [barang, produk] = await Promise.all([
        tx.barang.findFirst({ where: { produk_id: produkId }, select: { stok: true } }),
        tx.produk.findUnique({ where: { produk_id: produkId }, select: { status: true } }),
    ]);
    if (!produk) return;
    const statusBaru = computeStatusProduk(barang?.stok ?? 0, produk.status === "Habis" ? "Tersedia" : produk.status);
    if (statusBaru !== produk.status) {
        await tx.produk.update({ where: { produk_id: produkId }, data: { status: statusBaru } });
    }
}
