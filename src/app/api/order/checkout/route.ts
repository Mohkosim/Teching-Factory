import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";
import { generateKodeInvoice } from "@/lib/utils/invoice";
import { kurangiStokAtomic } from "@/lib/order/stok";
import { batalkanCheckout } from "@/lib/order/batal-checkout";
import { hitungTarifJurusan } from "@/lib/ongkir/tarif";
import type { CheckoutPayload } from "@/types/interfaces/checkout";

const MAX_ITEM = 50;
const MAX_JUMLAH_PER_ITEM = 999;
const SNAP_EXPIRY_MENIT = 60;

class CheckoutError extends Error {
    constructor(message: string, public status = 400) {
        super(message);
    }
}

interface ItemTervalidasi {
    produkId: string;
    jumlah: number;
    kombinasiId: string | null;
    keranjangDetailId?: string;
    hargaSatuan: number;
    jurusanId: string; 
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = (await req.json().catch(() => null)) as CheckoutPayload | null;
    if (!body || typeof body.alamatId !== "string" || !Array.isArray(body.toko) || body.toko.length === 0) {
        return NextResponse.json({ message: "Data checkout tidak lengkap" }, { status: 400 });
    }

    try {
        // ───────────── 1. Alamat milik user ─────────────
        const alamat = await prisma.alamat.findUnique({ where: { alamat_id: body.alamatId } });
        if (!alamat || alamat.user_id !== userId) throw new CheckoutError("Alamat tidak valid");
        if (!alamat.kota_id) throw new CheckoutError("Alamat belum memiliki data kota pengiriman");

        // ───────────── 2. Normalisasi item (jumlah wajib integer positif, gabungkan duplikat) ─────────────
        const mentah = body.toko.flatMap((g) => (Array.isArray(g?.produk) ? g.produk : []));
        if (mentah.length === 0 || mentah.length > MAX_ITEM) throw new CheckoutError("Jumlah item checkout tidak valid");

        const gabung = new Map<string, { produkId: string; jumlah: number; kombinasiId: string | null; keranjangDetailId?: string }>();
        for (const p of mentah) {
            if (typeof p?.produkId !== "string" || !p.produkId) throw new CheckoutError("Produk tidak valid");
            if (!Number.isInteger(p.jumlah) || p.jumlah < 1 || p.jumlah > MAX_JUMLAH_PER_ITEM) {
                throw new CheckoutError("Jumlah barang tidak valid");
            }
            const kombinasiId = typeof p.kombinasiId === "string" && p.kombinasiId ? p.kombinasiId : null;
            const key = `${p.produkId}::${kombinasiId ?? ""}`;
            const ada = gabung.get(key);
            if (ada) {
                ada.jumlah += p.jumlah;
                if (ada.jumlah > MAX_JUMLAH_PER_ITEM) throw new CheckoutError("Jumlah barang tidak valid");
            } else {
                gabung.set(key, {
                    produkId: p.produkId,
                    jumlah: p.jumlah,
                    kombinasiId,
                    keranjangDetailId: typeof p.keranjangDetailId === "string" ? p.keranjangDetailId : undefined,
                });
            }
        }

        // ───────────── 3. Harga, varian, & jurusan dibaca ULANG dari database ─────────────
        const produkIds = [...new Set([...gabung.values()].map((i) => i.produkId))];
        const produkRows = await prisma.produk.findMany({
            where: { produk_id: { in: produkIds } },
            include: {
                jasa: { select: { jasa_id: true } },
                jurusan: { include: { smk: { select: { kota_id: true } } } },
                varianKombinasi: { where: { aktif: true }, select: { kombinasi_id: true, harga: true } },
            },
        });
        const produkMap = new Map(produkRows.map((p) => [p.produk_id, p]));

        const items: ItemTervalidasi[] = [];
        for (const it of gabung.values()) {
            const produk = produkMap.get(it.produkId);
            if (!produk) throw new CheckoutError("Produk tidak ditemukan");
            if (produk.jasa.length > 0) throw new CheckoutError("Jasa tidak dapat dibeli lewat checkout produk");
            if (produk.status_publikasi !== "Published" || produk.status === "Nonaktif") {
                throw new CheckoutError("Salah satu produk sudah tidak tersedia");
            }

            let hargaSatuan = produk.harga;
            if (produk.varianKombinasi.length > 0) {
                const kombinasi = produk.varianKombinasi.find((k) => k.kombinasi_id === it.kombinasiId);
                if (!it.kombinasiId || !kombinasi) throw new CheckoutError("Varian produk tidak valid");
                hargaSatuan = kombinasi.harga;
            } else if (it.kombinasiId) {
                throw new CheckoutError("Varian produk tidak valid");
            }

            if (!Number.isInteger(hargaSatuan) || hargaSatuan <= 0) throw new CheckoutError("Harga produk tidak valid");

            items.push({ ...it, hargaSatuan, jurusanId: produk.jurusan_id });
        }

        // ───────────── 4. Pecah order per JURUSAN (batas seller yang dipakai seluruh aplikasi) ─────────────
        const perJurusan = new Map<string, ItemTervalidasi[]>();
        for (const it of items) {
            const list = perJurusan.get(it.jurusanId) ?? [];
            list.push(it);
            perJurusan.set(it.jurusanId, list);
        }
        const grup = [...perJurusan.entries()].map(([jurusanId, list]) => ({
            jurusanId,
            items: list,
            subtotal: list.reduce((s, i) => s + i.hargaSatuan * i.jumlah, 0),
        }));

        // ───────────── 5. Ongkir dihitung ULANG di server lewat RajaOngkir ─────────────
        const pilihan = body.toko[0]?.jasa;
        if (!pilihan?.kurir || !pilihan?.layanan) throw new CheckoutError("Jasa pengiriman belum dipilih");
        if (body.toko.some((g) => g.jasa?.kurir !== pilihan.kurir || g.jasa?.layanan !== pilihan.layanan)) {
            throw new CheckoutError("Jasa pengiriman tidak konsisten");
        }


        const ongkirPerGrup: number[] = [];
        const estimasiPerGrup: string[] = [];
        await Promise.all(
            grup.map(async (g, idx) => {
                const acuan = produkMap.get(g.items[0].produkId)!;
                const originId = acuan.jurusan.smk.kota_id;
                if (!originId) throw new CheckoutError("Kota asal salah satu toko belum diatur");

                const berat = g.items.reduce((s, i) => s + (produkMap.get(i.produkId)?.berat_gram ?? 1000) * i.jumlah, 0);
                const tarif = await hitungTarifJurusan({
                    originId,
                    destinationId: alamat.kota_id!,
                    weight: berat,
                    jurusanId: g.jurusanId,
                });
                const dipilih = tarif.data.find((t) => t.name === pilihan.kurir && t.service === pilihan.layanan);
                if (!dipilih || !Number.isInteger(dipilih.cost) || dipilih.cost < 0) {
                    throw new CheckoutError("Jasa pengiriman yang dipilih tidak tersedia untuk semua toko, silakan pilih ulang");
                }
                ongkirPerGrup[idx] = dipilih.cost;
                estimasiPerGrup[idx] = dipilih.etd || "-";
            })
        );

        // ───────────── 6. Simpan order + reservasi stok secara atomic ─────────────
        const kodeInvoice = generateKodeInvoice();
        const alamatLengkapGabungan = `${alamat.alamat_lengkap}, ${alamat.kecamatan}, ${alamat.kota}, ${alamat.provinsi} ${alamat.kode_pos}`;

        const { orderIds, totalKeseluruhan } = await prisma.$transaction(
            async (tx) => {
                const ids: string[] = [];
                let grandTotal = 0;

                for (const [idx, g] of grup.entries()) {
                    const ongkir = ongkirPerGrup[idx];
                    const totalHarga = g.subtotal + ongkir;
                    grandTotal += totalHarga;

                    const order = await tx.order.create({
                        data: {
                            user_id: userId,
                            kode_invoice: kodeInvoice,
                            seller_jurusan_id: g.jurusanId,
                            total_harga: totalHarga,
                            status_order: "Menunggu",
                            status_pembayaran: "Menunggu_Konfirmasi",
                            orderDetail: {
                                create: g.items.map((p) => ({
                                    produk_id: p.produkId,
                                    jumlah: p.jumlah,
                                    harga_satuan: p.hargaSatuan,
                                    subtotal: p.hargaSatuan * p.jumlah,
                                    kombinasi_id: p.kombinasiId,
                                })),
                            },
                            pengiriman: {
                                create: {
                                    nama_penerima: alamat.nama_penerima,
                                    alamat: alamatLengkapGabungan,
                                    kurir: `${pilihan.kurir} - ${pilihan.layanan}`,
                                    ongkir,
                                    estimasi_tiba: estimasiPerGrup[idx],
                                },
                            },
                        },
                    });

                    for (const p of g.items) {
                        await kurangiStokAtomic(tx, p);
                    }

                    ids.push(order.order_id);
                }

                const keranjangDetailIds = items.map((i) => i.keranjangDetailId).filter((v): v is string => Boolean(v));
                if (keranjangDetailIds.length > 0) {
                    const cartDetails = await tx.order_Detail.findMany({
                        where: {
                            order_detail_id: { in: keranjangDetailIds },
                            order: {
                                user_id: userId,
                                status_order: "Menunggu",
                                status_pembayaran: "Belum_Bayar",
                                pengiriman: null,
                            },
                        },
                        select: { order_detail_id: true, order_id: true },
                    });

                    const validIds = cartDetails.map((d) => d.order_detail_id);
                    const cartOrderIds = [...new Set(cartDetails.map((d) => d.order_id))];

                    if (validIds.length > 0) {
                        await tx.order_Detail.deleteMany({ where: { order_detail_id: { in: validIds } } });

                        for (const cartOrderId of cartOrderIds) {
                            const remaining = await tx.order_Detail.findMany({ where: { order_id: cartOrderId } });
                            if (remaining.length === 0) {
                                await tx.order.delete({ where: { order_id: cartOrderId } });
                            } else {
                                await tx.order.update({
                                    where: { order_id: cartOrderId },
                                    data: { total_harga: remaining.reduce((s, d) => s + d.subtotal, 0) },
                                });
                            }
                        }
                    }
                }

                return { orderIds: ids, totalKeseluruhan: grandTotal };
            },
            { maxWait: 10_000, timeout: 30_000 }
        );

        // ───────────── 7. Buat Snap; bila gagal, rollback reservasi ─────────────
        try {
            const midtransResponse = await snap.createTransaction({
                transaction_details: { order_id: kodeInvoice, gross_amount: totalKeseluruhan },
                customer_details: { first_name: alamat.nama_penerima, phone: alamat.nomor_telepon },

                expiry: { unit: "minutes", duration: SNAP_EXPIRY_MENIT },
            });

            return NextResponse.json({ kodeInvoice, orderIds, snapToken: midtransResponse.token });
        } catch (snapErr) {
            console.error("Gagal membuat Snap, membatalkan reservasi:", snapErr);
            await batalkanCheckout(userId, kodeInvoice).catch((e) => console.error("Rollback checkout gagal:", e));
            return NextResponse.json({ message: "Gagal membuat transaksi pembayaran" }, { status: 502 });
        }
    } catch (err) {
        if (err instanceof CheckoutError) {
            return NextResponse.json({ message: err.message }, { status: err.status });
        }
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
