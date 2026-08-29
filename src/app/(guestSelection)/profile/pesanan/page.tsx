import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPesananData } from "@/lib/data/pesanan";
import PesananClient from "./PesananClient";

export default async function PesananPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const [{ produk, jasa }, user] = await Promise.all([
        getPesananData(session.user.id),
        prisma.user.findUnique({
            where: { user_id: session.user.id },
            select: { name: true, img: true, phone: true, email: true },
        }),
    ]);

    // suntik data pembeli yang benar dari session/user, bukan dari query order
    const pembeli = {
        nama: user?.name ?? "",
        nomor: user?.phone ?? "-",
        email: user?.email ?? "",
    };
    const produkFinal = produk.map((p) => ({ ...p, pembeli: { ...p.pembeli, ...pembeli } }));
    const jasaFinal = jasa.map((j) => ({ ...j, pembeli: { ...j.pembeli, ...pembeli } }));

    return (
        <PesananClient
            initialProduk={produkFinal}
            initialJasa={jasaFinal}
            initialNama={user?.name ?? ""}
            initialAvatar={user?.img ?? null}
        />
    );
}