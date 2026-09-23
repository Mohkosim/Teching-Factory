import type { StatusProduk } from "@/generated/prisma/client";


export function computeStatusProduk(
    stok: number,
    statusDiminta: StatusProduk
): StatusProduk {
    if (statusDiminta === "Nonaktif") return "Nonaktif";
    if (stok <= 0) return "Habis";
    return statusDiminta;
}
