import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kontakSchema } from "@/lib/validations/kontak";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");
    const excludeDeleted = searchParams.get("excludeDeleted") === "true";

    const pesanList = await prisma.pesan.findMany({
      where: excludeDeleted ? { isDeleted: false } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit ? Number(limit) : undefined,
    });

    return NextResponse.json({ data: pesanList }, { status: 200 });
  } catch (error) {
    console.error("[KONTAK_GET]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = kontakSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Data tidak valid",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const pesan = await prisma.pesan.create({
      data: {
        nama: parsed.data.nama,
        email: parsed.data.email,
        phone: parsed.data.phone,
        pesan: parsed.data.pesan,
      },
    });

    return NextResponse.json(
      { message: "Pesan berhasil dikirim", data: pesan },
      { status: 201 }
    );
  } catch (error) {
    console.error("[KONTAK_POST]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}