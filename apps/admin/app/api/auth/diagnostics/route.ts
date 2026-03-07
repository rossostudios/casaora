import { NextResponse } from "next/server";
import { getServerAccessTokenDiagnostics } from "@/lib/auth/server-access-token";
import { SERVER_API_BASE_URL } from "@/lib/server-api-base";

export async function GET() {
  const diagnostics = await getServerAccessTokenDiagnostics();

  if (!(diagnostics.hasUserId || diagnostics.hasSessionId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ...diagnostics,
    apiBaseUrl: SERVER_API_BASE_URL,
  });
}
