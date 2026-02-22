import { fetchPublicJson } from "@/lib/api";

import { VendorPortal } from "./vendor-portal";

type PageProps = {
  params: Promise<{ token: string }>;
};

type VerifyResponse = {
  authenticated?: boolean;
  organization_id?: string;
  vendor_name?: string;
};

export default async function VendorPage({ params }: PageProps) {
  const { token } = await params;

  let auth: VerifyResponse | null = null;
  let error: string | null = null;

  try {
    auth = await fetchPublicJson<VerifyResponse>(
      "/public/vendor/verify",
      undefined,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      }
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Invalid or expired link.";
  }

  if (!(auth?.authenticated && auth.organization_id)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-3 rounded-xl border p-8 text-center">
          <h1 className="font-bold text-xl">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            {error ||
              "This link is invalid or has expired. Please contact your property manager for a new access link."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VendorPortal
        organizationId={auth.organization_id}
        token={token}
        vendorName={auth.vendor_name ?? "Vendor"}
      />
    </div>
  );
}
