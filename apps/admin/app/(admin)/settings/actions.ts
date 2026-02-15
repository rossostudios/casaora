"use server";

import { revalidatePath } from "next/cache";

import { deleteJson } from "@/lib/api";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function deleteOrganizationFromSettingsAction(input: {
  organizationId: string;
}): Promise<ActionResult> {
  const organizationId = input.organizationId?.trim();
  if (!organizationId)
    return { ok: false, error: "Falta el ID de la organización." };

  try {
    await deleteJson(`/organizations/${organizationId}`);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
