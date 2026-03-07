import { NextResponse } from "next/server";

import { errorMessage } from "@/lib/errors";
import { fetchPortfolioOverview } from "@/lib/portfolio-analytics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id")?.trim() ?? "";
  const period = searchParams.get("period")?.trim() ?? "30d";

  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "org_id is required." },
      { status: 400 }
    );
  }

  try {
    const data = await fetchPortfolioOverview(orgId, period);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: errorMessage(err) },
      { status: 500 }
    );
  }
}
