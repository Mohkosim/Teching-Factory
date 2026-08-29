import { getCurrentUserProfile } from "@/lib/getdata/get-profile";
import ProfileClient from "./profile-client";

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