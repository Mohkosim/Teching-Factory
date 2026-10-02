import { getSMKAccounts } from "@/lib/getdata/get-smk-account";
import { getPengajuanMitraMenunggu } from "@/lib/getdata/get-pengajuan-mitra";
import AccountManagement from "./account-management";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Management",
};

export default async function Page() {
    const [accounts, pengajuanMitra] = await Promise.all([
        getSMKAccounts(),
        getPengajuanMitraMenunggu(),
    ]);

    return <AccountManagement initialData={accounts} initialPengajuanMitra={pengajuanMitra} />;
}