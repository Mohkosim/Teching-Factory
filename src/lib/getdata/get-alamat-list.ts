import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AlamatData } from "@/types/interfaces/alamat";

export async function getAlamatList(): Promise<AlamatData[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const alamatList = await prisma.alamat.findMany({
    where: { user_id: session.user.id },
    orderBy: { isUtama: "desc" },
  });

  return alamatList;
}