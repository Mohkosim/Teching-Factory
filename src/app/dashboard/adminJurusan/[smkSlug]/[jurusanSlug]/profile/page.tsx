import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/getdata/get-profile";
import ProfileClient from "./profile-adminjurusan";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile Admin Jurusan",
};

export default async function Page() {
    const profile = await getCurrentUserProfile();
    if (!profile) redirect("/auth/login");

    return <ProfileClient initialData={profile} />;
}