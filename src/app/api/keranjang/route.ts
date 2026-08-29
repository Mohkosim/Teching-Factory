import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Order yang dianggap "keranjang": status Menunggu & belum punya data pengiriman
async function findCartOrder(userId: string) {
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
                        include: { foto: true, barang: true, jurusan: true },
                    },
                },
            },
        },
    });
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const cartOrder = await findCartOrder(session.user.id);

    const items = (cartOrder?.orderDetail ?? []).map((d) => {
        const p = d.produk;
        return {
            id: d.order_detail_id,
            produkId: p.produk_id,
            toko: p.jurusan?.nama_jurusan ?? "Jurusan",
            nama: p.nama_produk,
            stok: p.barang[0]?.stok ?? 0,
            harga: d.harga_satuan,
            thumbnail: p.foto[0]?.url ?? "",
            kuantitas: d.jumlah,
        };
    });

    return NextResponse.json({ orderId: cartOrder?.order_id ?? null, items });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { produkId, jumlah } = await req.json();
    if (!produkId) {
        return NextResponse.json({ message: "produkId wajib diisi" }, { status: 400 });
    }

    const produk = await prisma.produk.findUnique({ where: { produk_id: produkId } });
    if (!produk) {
        return NextResponse.json({ message: "Produk tidak ditemukan" }, { status: 404 });
    }

    const cartOrder = await findCartOrder(session.user.id);

    const orderId = cartOrder
        ? cartOrder.order_id
        : (await prisma.order.create({ data: { user_id: session.user.id, total_harga: 0 } })).order_id;

    const existing = cartOrder?.orderDetail.find((d) => d.produk_id === produkId);
    const tambahan = jumlah ?? 1;

    if (existing) {
        const jumlahBaru = existing.jumlah + tambahan;
        await prisma.order_Detail.update({
            where: { order_detail_id: existing.order_detail_id },
            data: { jumlah: jumlahBaru, subtotal: jumlahBaru * existing.harga_satuan },
        });
    } else {
        await prisma.order_Detail.create({
            data: {
                order_id: orderId,
                produk_id: produkId,
                jumlah: tambahan,
                harga_satuan: produk.harga,
                subtotal: tambahan * produk.harga,
            },
        });
    }

    const detailTerbaru = await prisma.order_Detail.findMany({ where: { order_id: orderId } });
    const totalHarga = detailTerbaru.reduce((sum, d) => sum + d.subtotal, 0);
    await prisma.order.update({ where: { order_id: orderId }, data: { total_harga: totalHarga } });

    return NextResponse.json({ success: true });
}