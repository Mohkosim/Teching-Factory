import { getPesananData } from "@/lib/data/pesanan";
import type { NotifikasiItem } from "@/types/interfaces/notifikasi";

const LABEL_PRODUK_TIMELINE: Record<number, string> = {
    0: "Menunggu pembayaran",
    1: "Pesanan sedang diproses penjual",
    2: "Pesanan sedang dikirim",
};

const LABEL_JASA_TIMELINE: Record<number, string> = {
    0: "Menunggu pembayaran",
    1: "Pesanan jasa sedang diproses",
    2: "Jasa sedang dikerjakan",
};

export async function getNotifikasiData(userId: string): Promise<NotifikasiItem[]> {
    const { produk, jasa } = await getPesananData(userId);
    const notifikasi: NotifikasiItem[] = [];

    // Kelompokkan produk per orderId biar tidak duplikat notifikasi timeline per item
    const produkPerOrder = new Map<string, typeof produk>();
    for (const item of produk) {
        const list = produkPerOrder.get(item.orderId) ?? [];
        list.push(item);
        produkPerOrder.set(item.orderId, list);
    }

    for (const items of produkPerOrder.values()) {
        const first = items[0];
        const label = LABEL_PRODUK_TIMELINE[first.timelineStep];
        if (label) {
            notifikasi.push({
                id: `produk-timeline-${first.orderId}`,
                jenis: "produk_timeline",
                judul: items.length > 1 ? `${items.length} produk` : first.nama,
                pesan: label,
                tanggal: first.tanggal,
                href: "/profile/pesanan",
                thumbnail: first.thumbnail,
            });
        }
    }

    // Notifikasi refund — dicek per item produk (bukan per order), karena refund bisa spesifik ke satu produk
    for (const item of produk) {
        if (!item.refund) continue;

        if (item.refund.status === "Disetujui") {
            notifikasi.push({
                id: `refund-disetujui-${item.refund.id}`,
                jenis: "refund_disetujui",
                judul: item.nama,
                pesan: item.refund.catatanAdmin
                    ? `Refund disetujui: ${item.refund.catatanAdmin}`
                    : "Refund Anda disetujui",
                tanggal: item.tanggal,
                href: "/profile/pesanan",
                thumbnail: item.thumbnail,
            });
        } else if (item.refund.status === "Ditolak") {
            notifikasi.push({
                id: `refund-ditolak-${item.refund.id}`,
                jenis: "refund_ditolak",
                judul: item.nama,
                pesan: item.refund.catatanAdmin
                    ? `Refund ditolak: ${item.refund.catatanAdmin}`
                    : "Refund Anda ditolak",
                tanggal: item.tanggal,
                href: "/profile/pesanan",
                thumbnail: item.thumbnail,
            });
        }
    }

    for (const item of jasa) {
        const labelTimeline = LABEL_JASA_TIMELINE[item.timelineStep];
        if (labelTimeline) {
            notifikasi.push({
                id: `jasa-timeline-${item.id}`,
                jenis: "jasa_timeline",
                judul: item.nama,
                pesan: labelTimeline,
                tanggal: item.tanggal,
                href: "/profile/pesanan",
                thumbnail: item.thumbnail,
            });
        }

        // Reminder cicilan: status masih "berjalan" (belum lunas)
        if (item.status === "berjalan") {
            const sudahDibayar = item.dp ?? 0;
            const sisaTagihan = item.total - sudahDibayar;
            if (sisaTagihan > 0) {
                notifikasi.push({
                    id: `jasa-bayar-${item.id}`,
                    jenis: "jasa_bayar",
                    judul: item.nama,
                    pesan: `Cicilan belum lunas, sisa Rp ${sisaTagihan.toLocaleString("id-ID")}`,
                    tanggal: item.tanggal,
                    href: "/profile/pesanan",
                    thumbnail: item.thumbnail,
                });
            }
        }
    }

    return notifikasi;
}