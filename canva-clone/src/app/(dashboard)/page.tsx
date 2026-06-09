import { protectServer } from "@/features/auth/utils";

import { HomeContent } from "./home-content";

export default async function Home() {
  await protectServer();

  return <HomeContent />;
};

