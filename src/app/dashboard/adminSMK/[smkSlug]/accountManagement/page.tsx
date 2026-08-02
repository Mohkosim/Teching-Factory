import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getJurusanAccounts } from "@/lib/getdata/get-jurusan-accounts";
import AccountManagementClient from "./account-management";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AdminSMK") redirect("/auth/login");

    const accounts = await getJurusanAccounts(session.user.id);

    return <AccountManagementClient initialData={accounts} />;
}