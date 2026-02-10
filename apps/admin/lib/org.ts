import { cookies } from "next/headers";

export const ORG_COOKIE_NAME = "pa-org-id";

export async function getActiveOrgId(): Promise<string | null> {
  const store = await cookies();
  const cookieValue = store.get(ORG_COOKIE_NAME)?.value?.trim();
  return cookieValue || null;
}
