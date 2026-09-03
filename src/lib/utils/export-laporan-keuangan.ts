import ExcelJS from "exceljs";

export type JenisTransaksiUI = "Pemasukan" | "Pengeluaran";
export type StatusSettlementUI = "Settled" | "Pending" | "Refund";

export interface TransaksiExportItem {
    noInvoice: string;
    tanggal: string;
    pembeliPemasok: string;
    jurusan: string;
    jenisTransaksi: JenisTransaksiUI;
    kategori: string;
    deskripsi: string;
    hargaSatuan: number;
    total: number;
    metodePembayaran: string;
    statusSettlement: StatusSettlementUI;
}

export interface RingkasanExport {
    totalPemasukan: number;
    totalPengeluaran: number;
    totalHpp: number;
    labaKotor: number;
    totalBiayaMidtrans: number;
    totalRefund: number;
    labaBersih: number;
}

const LAST_COL = 12;

const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFB0B0B0" } },
    left: { style: "thin", color: { argb: "FFB0B0B0" } },
    bottom: { style: "thin", color: { argb: "FFB0B0B0" } },
    right: { style: "thin", color: { argb: "FFB0B0B0" } },
};

function setupSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet("Laporan Keuangan", {
        pageSetup: { paperSize: 9, orientation: "landscape" },
    });

    sheet.columns = [
        { key: "no", width: 5 }, { key: "a", width: 20 }, { key: "b", width: 12 },
        { key: "c", width: 22 }, { key: "d", width: 14 }, { key: "e", width: 14 },
        { key: "f", width: 14 }, { key: "g", width: 28 }, { key: "h", width: 16 },
        { key: "i", width: 16 }, { key: "j", width: 16 }, { key: "k", width: 14 },
    ];

    return sheet;
}

function writeHeaderTitle(sheet: ExcelJS.Worksheet, rowIdx: number): number {
    sheet.mergeCells(rowIdx, 1, rowIdx, LAST_COL);
    const titleCell = sheet.getCell(rowIdx, 1);
    titleCell.value = "LAPORAN KEUANGAN";
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center" };
    rowIdx++;

    sheet.mergeCells(rowIdx, 1, rowIdx, LAST_COL);
    const subtitleCell = sheet.getCell(rowIdx, 1);
    subtitleCell.value = `Dicetak: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date())}`;
    subtitleCell.font = { italic: true, size: 10, color: { argb: "FF666666" } };
    subtitleCell.alignment = { horizontal: "center" };

    return rowIdx + 2;
}

function writeSummaryBlock(
    sheet: ExcelJS.Worksheet,
    rowIdx: number,
    title: string,
    rows: [string, number][],
    colStart: number = 1
): number {
    let r = rowIdx;

    sheet.mergeCells(r, colStart, r, colStart + 2);
    sheet.getCell(r, colStart).value = title;
    sheet.getCell(r, colStart).font = { bold: true, size: 11 };
    r++;

    rows.forEach(([label, value], i) => {
        const isLast = i === rows.length - 1;

        sheet.mergeCells(r, colStart, r, colStart + 1);
        const labelCell = sheet.getCell(r, colStart);
        labelCell.value = label;
        labelCell.font = { bold: isLast };
        labelCell.border = THIN_BORDER;

        const valueCell = sheet.getCell(r, colStart + 2);
        valueCell.value = value;
        valueCell.numFmt = "#,##0;(#,##0)";
        valueCell.font = { bold: isLast };
        valueCell.border = THIN_BORDER;
        valueCell.alignment = { horizontal: "right" };

        r++;
    });

    return r;
}

function writeRingkasanSection(
    sheet: ExcelJS.Worksheet,
    rowIdx: number,
    ringkasan: RingkasanExport
): number {
    const totalPengeluaranOps = ringkasan.totalPengeluaran - ringkasan.totalHpp;

    const labaKotorRows: [string, number][] = [
        ["Total Pemasukan", ringkasan.totalPemasukan],
        ["Harga Pokok Penjualan (HPP)", -ringkasan.totalHpp],
        ["Laba Kotor", ringkasan.labaKotor],
    ];

    const labaBersihRows: [string, number][] = [
        ["Laba Kotor", ringkasan.labaKotor],
        ["Total Pengeluaran Operasional", -totalPengeluaranOps],
        ["Biaya Admin (estimasi Midtrans)", -ringkasan.totalBiayaMidtrans],
        ["Laba Bersih", ringkasan.labaBersih],
    ];


    const endRowKotor = writeSummaryBlock(sheet, rowIdx, "RINGKASAN LABA KOTOR", labaKotorRows, 1);
    const endRowBersih = writeSummaryBlock(sheet, rowIdx, "RINGKASAN LABA BERSIH", labaBersihRows, 6);

    return Math.max(endRowKotor, endRowBersih) + 1;
}

const DETAIL_HEADERS = [
    "No", "No. Invoice", "Tanggal", "Pembeli/Pemasok",
    "Jenis Transaksi", "Kategori", "Deskripsi", "Harga Satuan (Rp)",
    "Total (Rp)", "Metode Pembayaran", "Status Settlement",
];

function writeGroupTitle(sheet: ExcelJS.Worksheet, rowIdx: number, jurusanNama: string): number {
    sheet.mergeCells(rowIdx, 1, rowIdx, LAST_COL);
    const titleCell = sheet.getCell(rowIdx, 1);
    titleCell.value = `DETAIL TRANSAKSI — JURUSAN ${jurusanNama.toUpperCase()}`;
    titleCell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0369A1" } };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };
    return rowIdx + 1;
}

function writeGroupHeaderRow(sheet: ExcelJS.Worksheet, rowIdx: number): number {
    DETAIL_HEADERS.forEach((h, i) => {
        const cell = sheet.getCell(rowIdx, i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0EA5E9" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = THIN_BORDER;
    });
    return rowIdx + 1;
}

function writeGroupRows(
    sheet: ExcelJS.Worksheet,
    rowIdx: number,
    items: TransaksiExportItem[]
): { nextRow: number; subtotalPemasukan: number; subtotalPengeluaran: number; subtotalRefund: number } {
    let subtotalPemasukan = 0;
    let subtotalPengeluaran = 0;
    let subtotalRefund = 0;

    items.forEach((item, idx) => {
        const values: (string | number | null)[] = [
            idx + 1, item.noInvoice, item.tanggal, item.pembeliPemasok,
            item.jenisTransaksi, item.kategori, item.deskripsi,
            item.hargaSatuan || null, item.total, item.metodePembayaran, item.statusSettlement,
        ];

        values.forEach((v, colIdx) => {
            const cell = sheet.getCell(rowIdx, colIdx + 1);
            cell.value = v;
            cell.border = THIN_BORDER;
            if (colIdx === 7 || colIdx === 8) {
                cell.numFmt = "#,##0";
                cell.alignment = { horizontal: "right" };
            }
            if (idx % 2 === 1) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
            }
        });

        if (item.statusSettlement === "Refund") {
            subtotalRefund += item.total;
        } else if (item.jenisTransaksi === "Pemasukan") {
            subtotalPemasukan += item.total;
        } else {
            subtotalPengeluaran += item.total;
        }

        rowIdx++;
    });

    return { nextRow: rowIdx, subtotalPemasukan, subtotalPengeluaran, subtotalRefund };
}

function writeGroupSubtotal(
    sheet: ExcelJS.Worksheet,
    rowIdx: number,
    jurusanNama: string,
    subtotalPemasukan: number,
    subtotalPengeluaran: number,
    subtotalRefund: number
): number {
    sheet.mergeCells(rowIdx, 1, rowIdx, 7);
    const subLabelCell = sheet.getCell(rowIdx, 1);

    let label =
        `Sub-total ${jurusanNama} — Pemasukan: Rp ${subtotalPemasukan.toLocaleString("id-ID")} | ` +
        `Pengeluaran: Rp ${subtotalPengeluaran.toLocaleString("id-ID")}`;

    if (subtotalRefund > 0) {
        label += ` | Refund: Rp ${subtotalRefund.toLocaleString("id-ID")}`;
    }

    subLabelCell.value = label;
    subLabelCell.font = { italic: true, bold: true, size: 10 };
    subLabelCell.border = THIN_BORDER;
    return rowIdx + 1;
}

function groupByJurusan(transaksi: TransaksiExportItem[]): Map<string, TransaksiExportItem[]> {
    const grouped = new Map<string, TransaksiExportItem[]>();
    transaksi.forEach((item) => {
        const key = item.jurusan || "Tanpa Jurusan";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
    });
    return grouped;
}

function writeDetailTable(
    sheet: ExcelJS.Worksheet,
    rowIdx: number,
    transaksi: TransaksiExportItem[]
): void {
    const grouped = groupByJurusan(transaksi);

    for (const [jurusanNama, items] of grouped) {
        rowIdx = writeGroupTitle(sheet, rowIdx, jurusanNama);
        rowIdx = writeGroupHeaderRow(sheet, rowIdx);

        const { nextRow, subtotalPemasukan, subtotalPengeluaran, subtotalRefund } = writeGroupRows(sheet, rowIdx, items);
        rowIdx = nextRow;

        rowIdx = writeGroupSubtotal(sheet, rowIdx, jurusanNama, subtotalPemasukan, subtotalPengeluaran, subtotalRefund);

        rowIdx++;
    }
}

function downloadWorkbook(buffer: ExcelJS.Buffer) {
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-keuangan-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
}

export async function exportLaporanKeuanganExcel(
    ringkasan: RingkasanExport,
    transaksi: TransaksiExportItem[]
) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AdminSMK";
    workbook.created = new Date();

    const sheet = setupSheet(workbook);

    let rowIdx = 1;
    rowIdx = writeHeaderTitle(sheet, rowIdx);
    rowIdx = writeRingkasanSection(sheet, rowIdx, ringkasan);
    writeDetailTable(sheet, rowIdx, transaksi);

    const buffer = await workbook.xlsx.writeBuffer();
    downloadWorkbook(buffer);
}