import { getCurrentUserProfile } from "@/lib/getdata/get-profile";
import ProfileClient from "./profile-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();

  return (
    <ProfileClient
      initialNama={profile?.name ?? ""}
      initialEmail={profile?.email ?? ""}
      initialTelepon={profile?.phone ?? ""}
      initialGender={profile?.gender ?? undefined}
      initialAvatar={profile?.img ?? null}
    />
  );
}