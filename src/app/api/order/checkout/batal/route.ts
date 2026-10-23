import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { batalkanCheckout } from "@/lib/order/batal-checkout";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body: { kodeInvoice?: string } = await req.json().catch(() => ({}));
    if (!body.kodeInvoice || typeof body.kodeInvoice !== "string") {
        return NextResponse.json({ message: "kodeInvoice wajib diisi" }, { status: 400 });
    }

    try {
        const hasil = await batalkanCheckout(session.user.id, body.kodeInvoice);
        if (!hasil.ok) {
            return NextResponse.json({ message: hasil.message }, { status: hasil.status });
        }
        return NextResponse.json({ message: "OK" });
    } catch (err) {
        console.error("Batalkan checkout error:", err);
        return NextResponse.json({ message: "Gagal membatalkan pesanan" }, { status: 500 });
    }
}
