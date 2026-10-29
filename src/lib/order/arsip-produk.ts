import "server-only";
import { prisma } from "@/lib/prisma";

export async function hapusAtauArsipkanProduk(produkId: string): Promise<"diarsipkan" | "dihapus"> {
    const pernahDipesan = await prisma.order_Detail.count({
        where: {
            produk_id: produkId,
            order: { OR: [{ kode_invoice: { not: null } }, { pengiriman: { isNot: null } }, { transaksi: { some: {} } }] },
        },
    });

    await prisma.$transaction([
        prisma.order_Detail.deleteMany({
            where: { produk_id: produkId, order: { kode_invoice: null, pengiriman: null } },
        }),
        prisma.produk.update({
            where: { produk_id: produkId },
            data: { deletedAt: new Date(), status: "Nonaktif" },
        }),
    ]);

    return pernahDipesan > 0 ? "diarsipkan" : "dihapus";
}
