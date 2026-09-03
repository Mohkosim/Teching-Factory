import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { KeranjangItem } from "@/types/interfaces/keranjang";

// Order yang dianggap "keranjang": status Menunggu & belum punya data pengiriman
export async function findCartOrder(userId: string) {
    return prisma.order.findFirst({
        where: {
            user_id: userId,
            status_order: "Menunggu",
            status_pembayaran: "Belum_Bayar",
            pengiriman: null,
        },
        include: {
            orderDetail: {
                include: {
                    produk: {
                        include: {
                            foto: true,
                            barang: true,
                            jurusan: {
                                include: {
                                    user: true, 
                                    smk: {
                                        include: { user: true }, 
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}

export async function getKeranjangItems(): Promise<KeranjangItem[]> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const cartOrder = await findCartOrder(session.user.id);

    return (cartOrder?.orderDetail ?? []).map((d) => {
        const p = d.produk;
        const smk = p.jurusan?.smk;
        return {
            id: d.order_detail_id,
            produkId: p.produk_id,
            toko: smk?.user?.name ?? p.jurusan?.nama_jurusan ?? "Toko",
            tokoId: smk?.smk_id ?? p.jurusan?.smk_id ?? "",
            tokoKotaId: smk?.kota_id ?? null,
            jurusanId: p.jurusan_id,
            nama: p.nama_produk,
            stok: p.barang[0]?.stok ?? 0,
            harga: d.harga_satuan,
            thumbnail: p.foto[0]?.url ?? "",
            kuantitas: d.jumlah,
            noWhatsapp: p.jurusan?.user?.phone ?? undefined,
        };
    });
}