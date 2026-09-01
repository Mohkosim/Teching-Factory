import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNotifikasiData } from "@/lib/data/notifikasi";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ notifikasi: [] }, { status: 401 });
    }

    const notifikasi = await getNotifikasiData(session.user.id);
    return NextResponse.json({ notifikasi });
}