import type { Prisma } from "@/generated/prisma/client";

export const OPSI_VARIAN_TERLIHAT: Prisma.VarianOpsiWhereInput = {
    OR: [
        { kombinasi: { none: { kombinasi: { aktif: false } } } },
        { kombinasi: { some: { kombinasi: { aktif: true } } } },
    ],
};

export const GRUP_VARIAN_TERLIHAT: Prisma.VarianGrupWhereInput = {
    opsi: { some: OPSI_VARIAN_TERLIHAT },
};
