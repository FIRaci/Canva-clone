import { protectServer } from "@/features/auth/utils";

import { ProfilePage } from "./profile-page";

export default async function AccountPage() {
  await protectServer();

  return <ProfilePage />;
}
