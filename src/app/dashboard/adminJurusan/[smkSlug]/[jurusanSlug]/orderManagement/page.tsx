import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth"; // sesuaikan path kalau authOptions diekspor dari file lain
import { prisma } from "@/lib/prisma";
import { getPesananByJurusan } from "@/lib/data/pesanan-admin";
import OrderManagementClient from "./Ordermanagementclient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Management",
};

export default async function PesananPage() {
    const session = await getServerSession(authOptions);


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

    const orders = await getPesananByJurusan(jurusan.jurusan_id);

    return <OrderManagementClient initialOrders={orders} />;
}