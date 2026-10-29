import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { terapkanFilterSoftDelete } from "@/lib/soft-delete-filter";

const connectionString = `${process.env.DATABASE_URL}`;

function createPrismaClients() {
    const adapter = new PrismaPg({ connectionString });
    const dasar = new PrismaClient({ adapter });

    const terfilter = dasar.$extends({
        name: "soft-delete",
        query: {
            $allModels: {
                $allOperations({ model, operation, args, query }) {
                    return query(terapkanFilterSoftDelete(model, operation, args) as typeof args);
                },
            },
        },
    });

    return { dasar, terfilter };
}

const globalForPrisma = globalThis as unknown as {
    prismaClients: ReturnType<typeof createPrismaClients> | undefined;
};

const clients = globalForPrisma.prismaClients ?? createPrismaClients();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaClients = clients;
}

const prisma = clients.terfilter;

const prismaAll = clients.dasar;


type PrismaTx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use">;

export { prisma, prismaAll };
export type { PrismaTx };
