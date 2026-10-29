export const MODEL_SOFT_DELETE: ReadonlySet<string> = new Set(["User", "Jurusan", "Produk", "Transaksi", "Order"]);

export const FILTER_RELASI: Readonly<Record<string, Record<string, unknown>>> = {
    Jasa: { produk: { deletedAt: null } },
    Order_Detail: { order: { deletedAt: null } },
    SMK: { user: { deletedAt: null } },
    Galeri: { user: { deletedAt: null } },
};

export const OPERASI_BACA: ReadonlySet<string> = new Set([
    "findMany",
    "findFirst",
    "findFirstOrThrow",
    "findUnique",
    "findUniqueOrThrow",
    "count",
    "aggregate",
    "groupBy",
]);

export function terapkanFilterSoftDelete(model: string, operation: string, args: unknown): Record<string, unknown> {
    const hasil: Record<string, unknown> = { ...((args as Record<string, unknown> | undefined) ?? {}) };
    if (!OPERASI_BACA.has(operation)) return hasil;

    const where = hasil.where as Record<string, unknown> | undefined;

    if (MODEL_SOFT_DELETE.has(model)) {
        if (where && where.deletedAt !== undefined) return hasil;
        hasil.where = { ...where, deletedAt: null };
        return hasil;
    }

    const relasi = FILTER_RELASI[model];
    if (relasi) {
        const andLama = where?.AND === undefined ? [] : Array.isArray(where.AND) ? where.AND : [where.AND];
        hasil.where = { ...where, AND: [...andLama, relasi] };
    }
    return hasil;
}
