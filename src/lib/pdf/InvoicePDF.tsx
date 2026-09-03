import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProdukItem, JasaItem } from "@/types/interfaces/pesanan";

const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    title: { fontSize: 18, fontWeight: 700, color: "#111827" },
    subtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },

    badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4, borderWidth: 1 },
    badgeLunas: { borderColor: "#059669", backgroundColor: "#f0fdf4" },
    badgeBelum: { borderColor: "#d97706", backgroundColor: "#fffbeb" },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeDotLunas: { backgroundColor: "#059669" },
    badgeDotBelum: { backgroundColor: "#d97706" },
    badgeTextLunas: { fontSize: 8, fontWeight: 700, color: "#059669", letterSpacing: 0.5 },
    badgeTextBelum: { fontSize: 8, fontWeight: 700, color: "#d97706", letterSpacing: 0.5 },

    section: { marginBottom: 14 },
    sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6, color: "#374151" },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    label: { color: "#6b7280" },
    value: { color: "#111827" },
    table: { marginTop: 4, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4 },
    tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
    colItem: { flex: 3 },
    colQty: { flex: 1, textAlign: "center" },
    colPrice: { flex: 1.5, textAlign: "right" },
    colSubtotal: { flex: 1.5, textAlign: "right" },
    th: { fontWeight: 700, color: "#374151" },
    summaryBox: { marginTop: 10, alignSelf: "flex-end", width: 220 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 6, marginTop: 4 },
    totalLabel: { fontSize: 11, fontWeight: 700, color: "#111827" },

    tokoCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, padding: 10, backgroundColor: "#f9fafb" },
    tokoNama: { fontSize: 11, fontWeight: 700, color: "#111827" },
    tokoJurusan: { fontSize: 9, color: "#4b5563", marginTop: 2 },

    footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

function formatRupiah(v: number) {
    return `Rp ${v.toLocaleString("id-ID")}`;
}

function StatusBadge({ lunas, labelLunas, labelBelum }: { lunas: boolean; labelLunas: string; labelBelum: string }) {
    return (
        <View style={[styles.badge, lunas ? styles.badgeLunas : styles.badgeBelum]}>
            <View style={[styles.badgeDot, lunas ? styles.badgeDotLunas : styles.badgeDotBelum]} />
            <Text style={lunas ? styles.badgeTextLunas : styles.badgeTextBelum}>
                {(lunas ? labelLunas : labelBelum).toUpperCase()}
            </Text>
        </View>
    );
}

function TokoCard({ namaSmk, namaJurusan }: { namaSmk: string; namaJurusan?: string }) {
    return (
        <View style={styles.tokoCard}>
            <Text style={styles.tokoNama}>{namaSmk}</Text>
            {namaJurusan && <Text style={styles.tokoJurusan}>Jurusan {namaJurusan}</Text>}
        </View>
    );
}

export function InvoiceProdukDocument({
    items, namaToko, namaJurusan,
}: { items: ProdukItem[]; namaToko: string; namaJurusan?: string }) {
    const first = items[0];
    const subtotal = items.reduce((sum, i) => sum + i.hargaAngka * i.jumlah, 0);
    const ongkir = first.biayaOngkir;
    const total = subtotal + ongkir;
    const sudahDibayar = items.every((i) => i.statusBayar === "Dibayar");

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>INVOICE</Text>
                        <Text style={styles.subtitle}>No. Invoice: {first.kodeInvoice}</Text>
                        <Text style={styles.subtitle}>Tanggal: {first.tanggal}</Text>
                    </View>
                    <StatusBadge lunas={sudahDibayar} labelLunas="Lunas" labelBelum="Belum Dibayar" />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Toko</Text>
                    <TokoCard namaSmk={namaToko} namaJurusan={namaJurusan} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ditagihkan Kepada</Text>
                    <Text style={styles.value}>{first.pembeli.nama}</Text>
                    <Text style={styles.label}>{first.pembeli.nomor}</Text>
                    <Text style={styles.label}>{first.pembeli.email}</Text>
                    <Text style={styles.label}>{first.pembeli.alamat}</Text>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.colItem, styles.th]}>Produk</Text>
                        <Text style={[styles.colQty, styles.th]}>Qty</Text>
                        <Text style={[styles.colPrice, styles.th]}>Harga</Text>
                        <Text style={[styles.colSubtotal, styles.th]}>Subtotal</Text>
                    </View>
                    {items.map((item) => (
                        <View style={styles.tableRow} key={item.id}>
                            <Text style={styles.colItem}>{item.nama}</Text>
                            <Text style={styles.colQty}>{item.jumlah}</Text>
                            <Text style={styles.colPrice}>{formatRupiah(item.hargaAngka)}</Text>
                            <Text style={styles.colSubtotal}>{formatRupiah(item.hargaAngka * item.jumlah)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}><Text style={styles.label}>Sub Total</Text><Text style={styles.value}>{formatRupiah(subtotal)}</Text></View>
                    <View style={styles.summaryRow}><Text style={styles.label}>Biaya Ongkir</Text><Text style={styles.value}>{formatRupiah(ongkir)}</Text></View>
                    <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalLabel}>{formatRupiah(total)}</Text></View>
                </View>

                <View style={[styles.section, { marginTop: 20 }]}>
                    <Text style={styles.sectionTitle}>Detail Pengiriman</Text>
                    <View style={styles.row}><Text style={styles.label}>Kurir</Text><Text style={styles.value}>{first.pengiriman.kurir}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>No. Resi</Text><Text style={styles.value}>{first.pengiriman.nomorResi || "-"}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Estimasi</Text><Text style={styles.value}>{first.pengiriman.estimasi}</Text></View>
                </View>

                <Text style={styles.footer}>Invoice ini dibuat otomatis oleh sistem dan sah tanpa tanda tangan.</Text>
            </Page>
        </Document>
    );
}

export function InvoiceJasaDocument({
    item, namaSmk, namaJurusan,
}: { item: JasaItem; namaSmk: string; namaJurusan?: string }) {
    const sudahDibayar = item.dp ?? item.total;
    const sisa = item.total - sudahDibayar;
    const lunas = item.status === "lunas";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>INVOICE JASA</Text>
                        <Text style={styles.subtitle}>No. Invoice: {item.kodeInvoice}</Text>
                        <Text style={styles.subtitle}>Tanggal: {item.tanggal}</Text>
                    </View>
                    <StatusBadge lunas={lunas} labelLunas="Lunas" labelBelum="Belum Lunas" />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Penyedia Jasa</Text>
                    <TokoCard namaSmk={namaSmk} namaJurusan={namaJurusan} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ditagihkan Kepada</Text>
                    <Text style={styles.value}>{item.pembeli.nama}</Text>
                    <Text style={styles.label}>{item.pembeli.nomor}</Text>
                    <Text style={styles.label}>{item.pembeli.email}</Text>
                    <Text style={styles.label}>{item.pembeli.alamat}</Text>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.colItem, styles.th]}>Jasa</Text>
                        <Text style={[styles.colQty, styles.th]}>Qty</Text>
                        <Text style={[styles.colSubtotal, styles.th]}>Total</Text>
                    </View>
                    <View style={styles.tableRow}>
                        <Text style={styles.colItem}>{item.nama}</Text>
                        <Text style={styles.colQty}>{item.jumlah}</Text>
                        <Text style={styles.colSubtotal}>{formatRupiah(item.total)}</Text>
                    </View>
                </View>

                <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}><Text style={styles.label}>Total Biaya</Text><Text style={styles.value}>{formatRupiah(item.total)}</Text></View>
                    <View style={styles.summaryRow}><Text style={styles.label}>{lunas ? "Sudah Dibayar" : "DP Dibayar"}</Text><Text style={styles.value}>{formatRupiah(sudahDibayar)}</Text></View>
                    <View style={styles.totalRow}><Text style={styles.totalLabel}>Sisa Pembayaran</Text><Text style={styles.totalLabel}>{sisa > 0 ? formatRupiah(sisa) : "Lunas"}</Text></View>
                </View>

                {item.riwayatPembayaran.length > 0 && (
                    <View style={[styles.section, { marginTop: 20 }]}>
                        <Text style={styles.sectionTitle}>Riwayat Pembayaran</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.colItem, styles.th]}>Tanggal</Text>
                                <Text style={[styles.colItem, styles.th]}>Metode</Text>
                                <Text style={[styles.colSubtotal, styles.th]}>Nominal</Text>
                            </View>
                            {item.riwayatPembayaran.map((r) => (
                                <View style={styles.tableRow} key={r.id}>
                                    <Text style={styles.colItem}>{r.tanggal}</Text>
                                    <Text style={styles.colItem}>{r.metode}</Text>
                                    <Text style={styles.colSubtotal}>{formatRupiah(r.nominal)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <Text style={styles.footer}>Invoice ini dibuat otomatis oleh sistem dan sah tanpa tanda tangan.</Text>
            </Page>
        </Document>
    );
}