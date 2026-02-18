import { redirect } from "next/navigation";
import {
  buildRedirectPath,
  type LegacyRouteSearchParams,
} from "@/lib/module-redirect";

type PageProps = {
  searchParams: Promise<LegacyRouteSearchParams>;
};

export default async function LegacyChannelsModulePage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  redirect(buildRedirectPath("/module/integrations", params, {}));
}
