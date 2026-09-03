export function generateKodeInvoice() {
    const tanggal = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `INV-${tanggal}-${random}`;
}

export function encodeCicilanOrderId(orderId: string): string {
    const compact = orderId.replace(/-/g, "");
    const timestamp = Date.now().toString(36);
    return `CICIL-${compact}-${timestamp}`;
}

export function decodeCicilanOrderId(midtransOrderId: string): string {
    const compact = midtransOrderId.split("-")[1];
    return [
        compact.slice(0, 8),
        compact.slice(8, 12),
        compact.slice(12, 16),
        compact.slice(16, 20),
        compact.slice(20, 32),
    ].join("-");
}