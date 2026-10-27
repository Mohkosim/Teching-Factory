import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { produkId, namaPelanggan, tanggal, nominalBayar } = body as {
        produkId?: string;
        namaPelanggan?: string;
        tanggal?: string;
        nominalBayar?: number;
    };

    if (!produkId || !namaPelanggan || !tanggal || !nominalBayar) {
        return NextResponse.json({ message: "Data tidak lengkap" }, { status: 400 });
    }

    const produk = await prisma.produk.findUnique({
        where: { produk_id: produkId },
        include: { jasa: true },
    });

    if (!produk || produk.jasa.length === 0 || produk.status_publikasi !== "Published" || produk.status === "Nonaktif") {
        return NextResponse.json({ message: "Jasa tidak ditemukan" }, { status: 404 });
    }

    if (!Number.isInteger(nominalBayar) || nominalBayar <= 0 || nominalBayar > produk.harga) {
        return NextResponse.json(
            { message: `Nominal pembayaran harus antara Rp 1 - Rp ${produk.harga.toLocaleString("id-ID")}` },
            { status: 400 }
        );
    }

    const minimalDpPersen = produk.jasa[0]?.minimal_dp_persen ?? 0;
    const minimalDp = Math.ceil((minimalDpPersen / 100) * produk.harga);
    if (nominalBayar < minimalDp) {
        return NextResponse.json(
            {
                message: `Nominal DP minimal Rp ${minimalDp.toLocaleString("id-ID")} (${minimalDpPersen}% dari harga jasa)`,
            },
            { status: 400 }
        );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
        return NextResponse.json({ message: "Format tanggal tidak valid" }, { status: 400 });
    }
    const tanggalPengerjaan = new Date(`${tanggal}T00:00:00.000Z`);
    const hariIni = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    const batasAkhir = new Date(hariIni);
    batasAkhir.setUTCFullYear(batasAkhir.getUTCFullYear() + 1);
    if (Number.isNaN(tanggalPengerjaan.getTime()) || tanggalPengerjaan < hariIni || tanggalPengerjaan > batasAkhir) {
        return NextResponse.json({ message: "Tanggal pengerjaan tidak valid" }, { status: 400 });
    }
    if (typeof namaPelanggan !== "string" || namaPelanggan.length > 100) {
        return NextResponse.json({ message: "Nama pelanggan tidak valid" }, { status: 400 });
    }

    const kodeInvoice = `INV-JASA-${Date.now()}`;
    const kapasitas = produk.jasa[0]?.kapasitas_harian ?? null;

    let order;
    try {
        order = await prisma.$transaction(async (tx) => {
            if (kapasitas !== null) {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`jasa:${produk.produk_id}:${tanggal}`}))`;
                const terpakai = await tx.order.count({
                    where: {
                        tanggal_pengerjaan: tanggalPengerjaan,
                        orderDetail: { some: { produk_id: produk.produk_id } },
                        status_order: { not: "Dibatalkan" },
                        status_pembayaran: { not: "Gagal" },
  
                        OR: [
                            { transaksi: { some: { jenis_transaksi: "Pemasukan" } } },
                            { createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
                        ],
                    },
                });
                if (terpakai >= kapasitas) throw new Error("SLOT_PENUH");
            }

            return tx.order.create({
                data: {
                    user_id: session.user.id,
                    kode_invoice: kodeInvoice,
                    seller_jurusan_id: produk.jurusan_id,
                    tanggal_pengerjaan: tanggalPengerjaan,
                    total_harga: produk.harga,
                    status_order: "Menunggu",
                    status_pembayaran: "Menunggu_Konfirmasi",
                    orderDetail: {
                        create: {
                            produk_id: produk.produk_id,
                            jumlah: 1,
                            harga_satuan: produk.harga,
                            subtotal: produk.harga,
                        },
                    },
                },
            });
        });
    } catch (err) {
        if (err instanceof Error && err.message === "SLOT_PENUH") {
            return NextResponse.json(
                { message: "Jadwal pada tanggal tersebut sudah penuh, silakan pilih tanggal lain" },
                { status: 409 }
            );
        }
        throw err;
    }

    const midtransOrderId = `JASA-${order.order_id}`;

    try {
        const midtransResponse = await snap.createTransaction({
            transaction_details: {
                order_id: midtransOrderId,
                gross_amount: nominalBayar,
            },
            customer_details: { first_name: namaPelanggan },
            expiry: { unit: "minutes", duration: 60 },
        });

        return NextResponse.json({
            orderId: order.order_id,
            kodeInvoice,
            snapToken: midtransResponse.token,
        });
    } catch (err) {
        console.error("Gagal membuat transaksi Snap untuk jasa:", err);
        await prisma.$transaction([
            prisma.order_Detail.deleteMany({ where: { order_id: order.order_id } }),
            prisma.order.delete({ where: { order_id: order.order_id } }),
        ]);
        return NextResponse.json({ message: "Gagal membuat transaksi pembayaran" }, { status: 500 });
    }
}