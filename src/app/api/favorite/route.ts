import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
        where: { userId: session.user.id },
        include: {
            produk: {
                include: {
                    foto: { take: 1 },
                    jurusan: true,
                },
            },
            jasa: {
                include: {
                    produk: {
                        include: {
                            foto: { take: 1 },
                            jurusan: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const result = favorites
        .map((f) => {
            if (f.produk) {
                return {
                    id: f.id,
                    tipe: "produk" as const,
                    produkId: f.produk.produk_id,
                    toko: f.produk.jurusan?.nama_jurusan ?? "-",
                    nama: f.produk.nama_produk,
                    harga: f.produk.harga,
                    thumbnail: f.produk.foto[0]?.url ?? "",
                };
            }
            if (f.jasa) {
                return {
                    id: f.id,
                    tipe: "jasa" as const,
                    jasaId: f.jasa.jasa_id,
                    toko: f.jasa.produk.jurusan?.nama_jurusan ?? "-",
                    nama: f.jasa.nama_jasa,
                    harga: f.jasa.produk.harga,
                    estimasi: f.jasa.estimasi_pengerjaan ?? "-",
                    thumbnail: f.jasa.produk.foto[0]?.url ?? "",
                };
            }
            return null;
        })
        .filter((item) => item !== null);

    return NextResponse.json(result);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    }

    const { produkId, jasaId } = await req.json();
    const userId = session.user.id;

    const existing = await prisma.favorite.findFirst({
        where: {
            userId,
            produkId: produkId ?? null,
            jasaId: jasaId ?? null,
        },
    });

    if (existing) {
        await prisma.favorite.delete({ where: { id: existing.id } });
        return NextResponse.json({ favorited: false });
    }

    await prisma.favorite.create({
        data: { userId, produkId: produkId ?? null, jasaId: jasaId ?? null },
    });
    return NextResponse.json({ favorited: true });
}