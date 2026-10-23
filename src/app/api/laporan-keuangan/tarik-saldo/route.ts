import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaldoJurusan } from "@/lib/data/laporan-keuangan";
import { requireRoleApi } from "@/lib/authz";

const MAX_NOMINAL = 10_000_000_000;

export async function POST(req: NextRequest) {
    const auth = await requireRoleApi(["AdminJurusan"]);
    if ("error" in auth) return auth.error;
    const { session } = auth;

    const jurusan = await prisma.jurusan.findUnique({ where: { user_id: session.user.id } });
    if (!jurusan)
        return NextResponse.json({ message: "Jurusan tidak ditemukan" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const nominal = Number(body.nominal);
    const nama_bank = String(body.nama_bank ?? "").trim();
    const nomor_rekening = String(body.nomor_rekening ?? "").trim();
    const atas_nama = String(body.atas_nama ?? "").trim();

    if (!Number.isInteger(nominal) || nominal <= 0 || nominal > MAX_NOMINAL) {
        return NextResponse.json({ message: "Nominal tidak valid" }, { status: 400 });
    }
    if (!nama_bank || !nomor_rekening || !atas_nama || nama_bank.length > 100 || atas_nama.length > 150 || !/^[0-9]{5,30}$/.test(nomor_rekening)) {
        return NextResponse.json({ message: "Data rekening belum lengkap atau tidak valid" }, { status: 400 });
    }

    try {
        const penarikan = await prisma.$transaction(
            async (tx) => {

                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"penarikan:" + jurusan.jurusan_id}))`;

                const { saldoTersedia } = await getSaldoJurusan(jurusan.jurusan_id);
                if (nominal > saldoTersedia) {
                    throw new Error("SALDO_KURANG");
                }

                return tx.penarikanSaldo.create({
                    data: {
                        jurusan_id: jurusan.jurusan_id,
                        user_id: session.user.id,
                        nominal,
                        nama_bank,
                        nomor_rekening,
                        atas_nama,
                        status: "Pending",
                    },
                });
            },
            { maxWait: 10_000, timeout: 30_000 }
        );

        return NextResponse.json({
            message: "Pengajuan tarik saldo berhasil dikirim, menunggu diproses",
            data: penarikan,
        });
    } catch (err) {
        if (err instanceof Error && err.message === "SALDO_KURANG") {
            return NextResponse.json(
                { message: "Nominal melebihi saldo yang tersedia (termasuk pengajuan yang masih diproses)" },
                { status: 400 }
            );
        }
        console.error("Tarik saldo error:", err);
        return NextResponse.json({ message: "Gagal mengajukan penarikan" }, { status: 500 });
    }
}
