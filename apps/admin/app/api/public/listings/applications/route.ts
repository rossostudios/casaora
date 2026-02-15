import { proxyMarketplaceRequest } from "../_shared";

export async function POST(request: Request) {
  const body = await request.text().catch(() => "");
  return proxyMarketplaceRequest("/public/listings/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
}
