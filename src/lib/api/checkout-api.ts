import type { CheckoutPayload, CheckoutResult } from "@/types/interfaces/checkout";

export async function buatPesanan(payload: CheckoutPayload): Promise<CheckoutResult> {
    const res = await fetch("/api/order/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Gagal membuat pesanan");
    }
    return res.json();
}

export async function batalkanPesananCheckout(kodeInvoice: string): Promise<{ message: string }> {
    const res = await fetch("/api/order/checkout/batal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kodeInvoice }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Gagal membatalkan pesanan");
    }
    return res.json();
}