import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";
import { generateKodeInvoice } from "@/lib/utils/invoice";
import type { CheckoutPayload } from "@/types/interfaces/checkout";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body: CheckoutPayload = await req.json();

    if (!body.alamatId || body.toko.length === 0) {
        return NextResponse.json({ message: "Data checkout tidak lengkap" }, { status: 400 });
    }

    const alamat = await prisma.alamat.findUnique({ where: { alamat_id: body.alamatId } });
    if (!alamat || alamat.user_id !== session.user.id) {
        return NextResponse.json({ message: "Alamat tidak valid" }, { status: 400 });
    }

    const kodeInvoice = generateKodeInvoice();
    const alamatLengkapGabungan = `${alamat.alamat_lengkap}, ${alamat.kecamatan}, ${alamat.kota}, ${alamat.provinsi} ${alamat.kode_pos}`;

    try {
        const { orderIds, totalKeseluruhan } = await prisma.$transaction(async (tx) => {
            // ==== Validasi stok SEMUA produk dulu, sebelum ada order yang dibuat ====
            // Supaya kalau satu produk saja stoknya kurang, seluruh checkout batal
            // (tidak ada order "setengah jalan" yang kebuat).
            for (const grup of body.toko) {
                for (const p of grup.produk) {
                    const barang = await tx.barang.findFirst({ where: { produk_id: p.produkId } });
                    if (!barang || barang.stok < p.jumlah) {
                        throw new Error(`STOK_HABIS:${p.produkId}`);
                    }
                }
            }

            const ids: string[] = [];
            let grandTotal = 0;

            for (const grup of body.toko) {
                const subtotal = grup.produk.reduce((s, p) => s + p.hargaSatuan * p.jumlah, 0);
                const totalHarga = subtotal + grup.jasa.ongkir;
                grandTotal += totalHarga;

                const order = await tx.order.create({
                    data: {
                        user_id: session.user.id,
                        kode_invoice: kodeInvoice,
                        total_harga: totalHarga,
                        status_order: "Menunggu",
                        status_pembayaran: "Menunggu_Konfirmasi",
                        orderDetail: {
                            create: grup.produk.map((p) => ({
                                produk_id: p.produkId,
                                jumlah: p.jumlah,
                                harga_satuan: p.hargaSatuan,
                                subtotal: p.hargaSatuan * p.jumlah,
                            })),
                        },
                        pengiriman: {
                            create: {
                                nama_penerima: alamat.nama_penerima,
                                alamat: alamatLengkapGabungan,
                                kurir: `${grup.jasa.kurir} - ${grup.jasa.layanan}`,
                                ongkir: grup.jasa.ongkir,
                                estimasi_tiba: grup.jasa.estimasi,
                            },
                        },
                        // Transaksi TIDAK dibuat di sini — baru dicatat lewat webhook
                        // /api/midtrans/notification saat Midtrans konfirmasi settlement,
                        // supaya tidak ada transaksi "hantu" untuk pembayaran yang gagal/batal.
                    },
                });

                for (const p of grup.produk) {
                    await tx.barang.updateMany({
                        where: { produk_id: p.produkId },
                        data: { stok: { decrement: p.jumlah } },
                    });
                    await tx.produk.update({
                        where: { produk_id: p.produkId },
                        data: { sold_count: { increment: p.jumlah } },
                    });
                }

                ids.push(order.order_id);
            }

            // === Hapus item yang baru saja di-checkout dari keranjang (cart order lama) ===
            const keranjangDetailIds = body.toko
                .flatMap((g) => g.produk.map((p) => p.keranjangDetailId))
                .filter((v): v is string => Boolean(v));

            if (keranjangDetailIds.length > 0) {
                const cartDetails = await tx.order_Detail.findMany({
                    where: {
                        order_detail_id: { in: keranjangDetailIds },
                        order: {
                            user_id: session.user.id,
                            status_order: "Menunggu",
                            pengiriman: null, // ciri khas cart order (belum checkout)
                        },
                    },
                    select: { order_detail_id: true, order_id: true },
                });

                const validIds = cartDetails.map((d) => d.order_detail_id);
                const cartOrderIds = [...new Set(cartDetails.map((d) => d.order_id))];

                if (validIds.length > 0) {
                    await tx.order_Detail.deleteMany({
                        where: { order_detail_id: { in: validIds } },
                    });

                    for (const cartOrderId of cartOrderIds) {
                        const remaining = await tx.order_Detail.count({ where: { order_id: cartOrderId } });
                        if (remaining === 0) {
                            await tx.order.delete({ where: { order_id: cartOrderId } });
                        }
                    }
                }
            }

            return { orderIds: ids, totalKeseluruhan: grandTotal };
        });

        // ==== Buat transaksi Snap ke Midtrans ====
        const midtransResponse = await snap.createTransaction({
            transaction_details: {
                order_id: kodeInvoice,
                gross_amount: totalKeseluruhan,
            },
            customer_details: {
                first_name: alamat.nama_penerima,
                phone: alamat.nomor_telepon,
            },
        });

        return NextResponse.json({
            kodeInvoice,
            orderIds,
            snapToken: midtransResponse.token,
        });
    } catch (err) {
        if (err instanceof Error && err.message.startsWith("STOK_HABIS:")) {
            return NextResponse.json(
                { message: "Salah satu produk di keranjangmu stoknya sudah habis atau kurang, silakan periksa kembali" },
                { status: 400 }
            );
        }
        console.error("Checkout error:", err);
        return NextResponse.json({ message: "Gagal membuat pesanan" }, { status: 500 });
    }
}