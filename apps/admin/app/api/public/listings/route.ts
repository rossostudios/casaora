import { proxyMarketplaceRequest } from "./_shared";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "60";
  return proxyMarketplaceRequest(`/public/listings?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
  });
}
