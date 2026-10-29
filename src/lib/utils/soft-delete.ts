import type { Prisma } from "@/generated/prisma/client";
import type { PrismaTx } from "@/lib/prisma";


export const FAVORIT_TIDAK_TERHAPUS: Prisma.FavoriteWhereInput = {
    NOT: {
        OR: [
            { produk: { deletedAt: { not: null } } },
            { jasa: { produk: { deletedAt: { not: null } } } },
        ],
    },
};


export async function softDeleteJurusan(tx: PrismaTx, jurusanIds: string[]): Promise<void> {
    if (jurusanIds.length === 0) return;

    const sekarang = new Date();

    const jurusanList = await tx.jurusan.findMany({
        where: { jurusan_id: { in: jurusanIds } },
        select: { user_id: true },
    });

    await tx.order_Detail.deleteMany({
        where: {
            produk: { jurusan_id: { in: jurusanIds } },
            order: { kode_invoice: null, pengiriman: null },
        },
    });

    await tx.produk.updateMany({
        where: { jurusan_id: { in: jurusanIds }, deletedAt: null },
        data: { deletedAt: sekarang, status: "Nonaktif" },
    });

    await tx.jurusan.updateMany({
        where: { jurusan_id: { in: jurusanIds }, deletedAt: null },
        data: { deletedAt: sekarang },
    });

    await tx.user.updateMany({
        where: { user_id: { in: jurusanList.map((j) => j.user_id) }, deletedAt: null },
        data: { deletedAt: sekarang, isActive: false },
    });
}
