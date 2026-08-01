import { getSMKAccounts } from "@/lib/getdata/get-smk-account";
import AccountManagement from "./account-management";

export default async function Page() {
    const accounts = await getSMKAccounts();

    return <AccountManagement initialData={accounts} />;
}