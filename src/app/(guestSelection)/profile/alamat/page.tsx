import { getCurrentUserProfile } from "@/lib/getdata/get-profile";
import { getAlamatList } from "@/lib/getdata/get-alamat-list";
import AlamatClient from "./alamat-client";

export default async function AlamatPage() {
  const [profile, alamatList] = await Promise.all([
    getCurrentUserProfile(),
    getAlamatList(),
  ]);

  return (
    <AlamatClient
      initialNama={profile?.name ?? ""}
      initialAvatar={profile?.img ?? null}
      initialTelepon={profile?.phone ?? ""}
      initialAlamatList={alamatList}
    />
  );
}