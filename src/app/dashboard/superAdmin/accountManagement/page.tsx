import { getSMKAccounts } from "@/lib/getdata/get-smk-account";
import AccountManagement from "./account-management";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Management",
};

export default async function Page() {
    const accounts = await getSMKAccounts();

    return <AccountManagement initialData={accounts} />;
}