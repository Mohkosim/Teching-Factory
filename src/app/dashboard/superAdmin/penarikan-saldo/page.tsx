import { getPenarikanSaldoList } from "@/lib/data/penarikan-saldo";
import PenarikanSaldoClient from "./penarikan-saldo-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Penarikan Saldo",
};

export default async function Page() {
    const data = await getPenarikanSaldoList();
    return <PenarikanSaldoClient initialData={data} />;
}