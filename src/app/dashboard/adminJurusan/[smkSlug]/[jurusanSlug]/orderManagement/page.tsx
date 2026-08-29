import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth"; // sesuaikan path kalau authOptions diekspor dari file lain
import { prisma } from "@/lib/prisma";
import { getPesananByJurusan } from "@/lib/data/pesanan-admin";
import OrderManagementClient from "./Ordermanagementclient";

export default async function PesananPage() {
    const session = await getServerSession(authOptions);

    // session.user.id ada (lihat callback session di authOptions), tapi
    // jurusan_id (uuid asli) tidak disimpan di token — yang disimpan cuma
    // jurusanSlug (buat URL). Jadi perlu 1x query untuk ambil jurusan_id.
    if (!session || session.user.role !== "AdminJurusan") {
        redirect("/auth/login");
    }

    const jurusan = await prisma.jurusan.findUnique({
        where: { user_id: session.user.id },
        select: { jurusan_id: true },
    });

    if (!jurusan) {
        redirect("/auth/login");
    }

    // Fetch dilakukan di server, sekali, saat render halaman.
    // Client component menerima hasilnya sebagai initial state lewat props —
    // tidak butuh useEffect untuk "load data setelah mount".
    const orders = await getPesananByJurusan(jurusan.jurusan_id);

    return <OrderManagementClient initialOrders={orders} />;
}