import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedDetail(detailId: string, userId: string) {
    const detail = await prisma.order_Detail.findUnique({
        where: { order_detail_id: detailId },
        include: { order: true },
    });
    if (!detail || detail.order.user_id !== userId || detail.order.status_order !== "Menunggu") return null;
    return detail;
}

async function syncTotalHarga(orderId: string) {
    const details = await prisma.order_Detail.findMany({ where: { order_id: orderId } });
    const total = details.reduce((sum, d) => sum + d.subtotal, 0);
    await prisma.order.update({ where: { order_id: orderId }, data: { total_harga: total } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const detail = await getOwnedDetail(id, session.user.id);
    if (!detail) {
        return NextResponse.json({ message: "Item tidak ditemukan" }, { status: 404 });
    }

    const { delta, jumlah } = await req.json();
    const jumlahBaru = jumlah !== undefined ? Number(jumlah) : detail.jumlah + Number(delta ?? 0);

    if (jumlahBaru <= 0) {
        await prisma.order_Detail.delete({ where: { order_detail_id: detail.order_detail_id } });
        await syncTotalHarga(detail.order_id);
        return NextResponse.json({ deleted: true });
    }

    const jumlahFinal = Math.max(1, jumlahBaru);
    await prisma.order_Detail.update({
        where: { order_detail_id: detail.order_detail_id },
        data: { jumlah: jumlahFinal, subtotal: jumlahFinal * detail.harga_satuan },
    });
    await syncTotalHarga(detail.order_id);

    return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const detail = await getOwnedDetail(id, session.user.id);
    if (!detail) {
        return NextResponse.json({ message: "Item tidak ditemukan" }, { status: 404 });
    }

    await prisma.order_Detail.delete({ where: { order_detail_id: detail.order_detail_id } });
    await syncTotalHarga(detail.order_id);

    return NextResponse.json({ deleted: true });
}