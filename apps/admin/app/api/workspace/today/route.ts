import { NextResponse } from "next/server";
import { getActiveLocale } from "@/lib/i18n/server";
import { getTodayWorkspaceData } from "@/lib/workspace";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id")?.trim() ?? "";

  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "org_id is required." },
      { status: 400 }
    );
  }

  const locale = await getActiveLocale();
  const data = await getTodayWorkspaceData(orgId, locale);
  return NextResponse.json(data);
}
