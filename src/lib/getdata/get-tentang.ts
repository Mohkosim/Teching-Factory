import { prisma } from "@/lib/prisma";

export async function getTentangTefaData() {
  return prisma.tentangTefa.findFirst({
    include: { dokumentasi: { orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
}