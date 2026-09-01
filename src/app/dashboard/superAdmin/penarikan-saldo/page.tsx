import { getPenarikanSaldoList } from "@/lib/data/penarikan-saldo";
import PenarikanSaldoClient from "./penarikan-saldo-client";

export default async function Page() {
    const data = await getPenarikanSaldoList();
    return <PenarikanSaldoClient initialData={data} />;
}