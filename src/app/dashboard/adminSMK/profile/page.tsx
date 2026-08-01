import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/getdata/get-profile";
import ProfileClient from "./profile-adminsmk";

export default async function Page() {
    const profile = await getCurrentUserProfile();
    if (!profile) redirect("/auth/login");

    return <ProfileClient initialData={profile} />;
}