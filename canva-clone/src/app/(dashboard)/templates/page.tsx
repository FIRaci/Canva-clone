import { protectServer } from "@/features/auth/utils";

import { TemplatesContent } from "../templates-content";

export default async function TemplatesPage() {
  await protectServer();

  return <TemplatesContent />;
}
