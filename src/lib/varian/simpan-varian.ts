import "server-only";
import { randomUUID } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma, type PrismaTx } from "@/lib/prisma";
import { sinkronStatusProduk } from "@/lib/order/stok";
import type { SimpanVarianInput } from "@/lib/validations/varian";

type Tx = PrismaTx;

export class VarianError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "VarianError";
    }
}

export interface HasilSimpanVarian {
    perluValidasiUlang: boolean;
}

const kunciOpsi = (indeksGrup: number, namaOpsi: string) => `${indeksGrup}::${namaOpsi}`;
const tandaTangan = (opsiIds: string[]) => [...opsiIds].sort().join("|");

function validasiStruktur({ grup, kombinasi }: SimpanVarianInput) {
    const namaGrup = new Set<string>();
    for (const g of grup) {
        if (namaGrup.has(g.nama)) throw new VarianError(`Nama grup varian "${g.nama}" dipakai lebih dari sekali`);
        namaGrup.add(g.nama);

        const namaOpsi = new Set<string>();
        for (const o of g.opsi) {
            if (namaOpsi.has(o.nama)) throw new VarianError(`Opsi "${o.nama}" pada grup "${g.nama}" dipakai lebih dari sekali`);
            namaOpsi.add(o.nama);
        }
    }

    if (kombinasi.length > 0 && grup.length === 0) {
        throw new VarianError("Kombinasi varian membutuhkan minimal satu grup varian");
    }

    const dilihat = new Set<string>();
    for (const k of kombinasi) {
        if (k.opsi_nama.length !== grup.length) {
            throw new VarianError("Setiap kombinasi harus memilih satu opsi dari setiap grup varian");
        }
        const kunci = k.opsi_nama.join("\u0000");
        if (dilihat.has(kunci)) throw new VarianError("Ada kombinasi varian yang sama persis, mohon periksa kembali");
        dilihat.add(kunci);
    }
}

async function sinkronStokProduk(tx: Tx, produkId: string) {
    const total = await tx.varianKombinasi.aggregate({
        where: { produk_id: produkId, aktif: true },
        _sum: { stok: true },
    });
    const stokBaru = total._sum.stok ?? 0;

    const barang = await tx.barang.findFirst({ where: { produk_id: produkId }, select: { barang_id: true } });
    if (barang) {
        await tx.barang.update({ where: { barang_id: barang.barang_id }, data: { stok: stokBaru } });
    } else {
        await tx.barang.create({ data: { produk_id: produkId, stok: stokBaru, kondisi: "Baru" } });
    }
    await sinkronStatusProduk(tx, produkId);
}

export async function simpanVarian(
    produkId: string,
    input: SimpanVarianInput,
    opsi: { validasiUlangJikaBerubah: boolean }
): Promise<HasilSimpanVarian> {
    validasiStruktur(input);
    const { grup, kombinasi } = input;

    return prisma.$transaction(
        async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`varian:${produkId}`}))`;

            const grupLama = await tx.varianGrup.findMany({
                where: { produk_id: produkId },
                include: { opsi: true },
            });
            const kombinasiLama = await tx.varianKombinasi.findMany({
                where: { produk_id: produkId },
                include: { opsi: { select: { opsi_id: true } } },
            });

            let perubahanInti = false;

            const grupLamaByNama = new Map(grupLama.map((g) => [g.nama, g]));
            const opsiIdByKunci = new Map<string, string>();
            const grupDipakai = new Set<string>();
            const opsiDipakai = new Set<string>();
            const grupBaru: Prisma.VarianGrupCreateManyInput[] = [];
            const opsiBaru: Prisma.VarianOpsiCreateManyInput[] = [];

            for (const [i, g] of grup.entries()) {
                const lama = grupLamaByNama.get(g.nama);
                let grupId: string;
                if (lama) {
                    grupId = lama.grup_id;
                    if (lama.urutan !== i) {
                        await tx.varianGrup.update({ where: { grup_id: grupId }, data: { urutan: i } });
                    }
                } else {
                    grupId = randomUUID();
                    grupBaru.push({ grup_id: grupId, produk_id: produkId, nama: g.nama, urutan: i });
                    perubahanInti = true;
                }
                grupDipakai.add(grupId);

                const opsiLamaByNama = new Map((lama?.opsi ?? []).map((o) => [o.nama, o]));
                for (const [j, o] of g.opsi.entries()) {
                    const opsiLama = opsiLamaByNama.get(o.nama);
                    let opsiId: string;
                    if (opsiLama) {
                        opsiId = opsiLama.opsi_id;
                        if (opsiLama.urutan !== j) {
                            await tx.varianOpsi.update({ where: { opsi_id: opsiId }, data: { urutan: j } });
                        }
                    } else {
                        opsiId = randomUUID();
                        opsiBaru.push({ opsi_id: opsiId, grup_id: grupId, nama: o.nama, urutan: j });
                        perubahanInti = true;
                    }
                    opsiIdByKunci.set(kunciOpsi(i, o.nama), opsiId);
                    opsiDipakai.add(opsiId);
                }
            }
            if (grupBaru.length > 0) await tx.varianGrup.createMany({ data: grupBaru });
            if (opsiBaru.length > 0) await tx.varianOpsi.createMany({ data: opsiBaru });

            const kombinasiLamaByTtd = new Map(
                kombinasiLama.map((k) => [tandaTangan(k.opsi.map((o) => o.opsi_id)), k])
            );
            const ttdDipakai = new Set<string>();
            const kombinasiBaru: Prisma.VarianKombinasiCreateManyInput[] = [];
            const junctionBaru: Prisma.VarianKombinasiOpsiCreateManyInput[] = [];

            for (const k of kombinasi) {
                const opsiIds = k.opsi_nama.map((nama, i) => {
                    const id = opsiIdByKunci.get(kunciOpsi(i, nama));
                    if (!id) throw new VarianError(`Opsi "${nama}" pada grup "${grup[i]?.nama}" tidak ditemukan`);
                    return id;
                });
                const ttd = tandaTangan(opsiIds);
                const lama = kombinasiLamaByTtd.get(ttd);

                if (lama) {
                    ttdDipakai.add(ttd);
                    if (lama.harga !== k.harga || !lama.aktif) perubahanInti = true;
                    await tx.varianKombinasi.update({
                        where: { kombinasi_id: lama.kombinasi_id },
                        data: {
                            harga: k.harga,
                            stok: k.stok,
                            sku: k.sku ?? null,
                            gambar: k.gambar ?? null,
                            aktif: true,
                        },
                    });
                } else {
                    const kombinasiId = randomUUID();
                    kombinasiBaru.push({
                        kombinasi_id: kombinasiId,
                        produk_id: produkId,
                        harga: k.harga,
                        stok: k.stok,
                        sku: k.sku,
                        gambar: k.gambar,
                    });
                    for (const opsiId of opsiIds) junctionBaru.push({ kombinasi_id: kombinasiId, opsi_id: opsiId });
                    perubahanInti = true;
                }
            }
            if (kombinasiBaru.length > 0) {
                await tx.varianKombinasi.createMany({ data: kombinasiBaru });
                await tx.varianKombinasiOpsi.createMany({ data: junctionBaru });
            }

            const kombinasiDibuang = kombinasiLama.filter(
                (k) => !ttdDipakai.has(tandaTangan(k.opsi.map((o) => o.opsi_id)))
            );
            if (kombinasiDibuang.some((k) => k.aktif)) perubahanInti = true;

            if (kombinasiDibuang.length > 0) {
                const sudahDipesan = await tx.order_Detail.findMany({
                    where: { kombinasi_id: { in: kombinasiDibuang.map((k) => k.kombinasi_id) } },
                    select: { kombinasi_id: true },
                    distinct: ["kombinasi_id"],
                });
                const dipesanIds = new Set(sudahDipesan.map((d) => d.kombinasi_id));

                const arsipIds = kombinasiDibuang.filter((k) => dipesanIds.has(k.kombinasi_id)).map((k) => k.kombinasi_id);
                const hapusIds = kombinasiDibuang.filter((k) => !dipesanIds.has(k.kombinasi_id)).map((k) => k.kombinasi_id);

                if (arsipIds.length > 0) {
                    await tx.varianKombinasi.updateMany({
                        where: { kombinasi_id: { in: arsipIds } },
                        data: { aktif: false, stok: 0 },
                    });
                }
                if (hapusIds.length > 0) {
                    await tx.varianKombinasi.deleteMany({ where: { kombinasi_id: { in: hapusIds } } });
                }
            }

            const opsiBasi = grupLama.flatMap((g) => g.opsi).filter((o) => !opsiDipakai.has(o.opsi_id)).map((o) => o.opsi_id);
            if (opsiBasi.length > 0) {
                await tx.varianOpsi.deleteMany({ where: { opsi_id: { in: opsiBasi }, kombinasi: { none: {} } } });
            }
            const grupBasi = grupLama.filter((g) => !grupDipakai.has(g.grup_id)).map((g) => g.grup_id);
            if (grupBasi.length > 0) {
                await tx.varianGrup.deleteMany({ where: { grup_id: { in: grupBasi }, opsi: { none: {} } } });
            }

            if (kombinasi.length > 0) await sinkronStokProduk(tx, produkId);

            let perluValidasiUlang = false;
            if (opsi.validasiUlangJikaBerubah && perubahanInti) {
                const hasil = await tx.produk.updateMany({
                    where: { produk_id: produkId, status_publikasi: "Published" },
                    data: { status_publikasi: "Pending" },
                });
                perluValidasiUlang = hasil.count > 0;
            }

            return { perluValidasiUlang };
        },
        { timeout: 15000, maxWait: 10000 }
    );
}
