import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PESAN_GUNAKAN_PENGELUARAN, TEMPLATE_MAP, adalahPengeluaranKas } from "@/lib/akuntansi/coa";
import { validasiBarisManual } from "@/lib/akuntansi/engine";
import { requireRoleApi } from "@/lib/authz";

const TIPE_VALID = ["ModalAwal", "Penyesuaian", "Umum"] as const;

export async function POST(req: NextRequest) {
    const auth = await requireRoleApi(["AdminJurusan"]);
    if ("error" in auth) return auth.error;
    const session = auth.session;

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan) return NextResponse.json({ message: "Jurusan tidak ditemukan" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });

    const tipe = body.tipe as (typeof TIPE_VALID)[number];
    if (!TIPE_VALID.includes(tipe)) return NextResponse.json({ message: "Tipe jurnal tidak valid" }, { status: 400 });

    const keterangan = String(body.keterangan ?? "").trim();
    if (!keterangan) return NextResponse.json({ message: "Keterangan wajib diisi" }, { status: 400 });

    const tanggal = new Date(`${String(body.tanggal ?? "")}T05:00:00Z`);
    if (isNaN(tanggal.getTime())) return NextResponse.json({ message: "Tanggal tidak valid" }, { status: 400 });

    const templateId = body.templateId ? String(body.templateId) : null;
    if (templateId && TEMPLATE_MAP[templateId]?.tipe !== tipe) {
        return NextResponse.json({ message: "Template tidak sesuai dengan tipe jurnal" }, { status: 400 });
    }

    const cek = validasiBarisManual(body.baris);
    if (!cek.ok) return NextResponse.json({ message: cek.error }, { status: 400 });

    if (tipe === "Umum" && adalahPengeluaranKas(cek.baris)) {
        return NextResponse.json({ message: PESAN_GUNAKAN_PENGELUARAN }, { status: 400 });
    }

    const jurnal = await prisma.jurnalManual.create({
        data: {
            jurusan_id: jurusan.jurusan_id,
            user_id: session.user.id,
            tanggal,
            tipe,
            template_id: templateId,
            keterangan,
            baris: cek.baris.map((b) => ({ kode: b.kode, debit: b.debit, kredit: b.kredit })),
        },
    });

    return NextResponse.json({ message: "Jurnal berhasil diposting", data: { jurnal_id: jurnal.jurnal_id } });
}
