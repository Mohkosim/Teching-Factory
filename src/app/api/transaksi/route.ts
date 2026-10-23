import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        { message: "Endpoint ini sudah tidak digunakan. Pembayaran dicatat otomatis oleh Midtrans." },
        { status: 410 }
    );
}
