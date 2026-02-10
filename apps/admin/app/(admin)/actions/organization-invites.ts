"use server";

import { revalidatePath } from "next/cache";

import { deleteJson, postJson } from "@/lib/api";

type ActionResult = { ok: true } | { ok: false; error: string };

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function createOrganizationInviteAction(input: {
  organizationId: string;
  email: string;
  role: string;
  expiresInDays?: number;
}): Promise<ActionResult> {
  const organizationId = normalize(input.organizationId);
  const email = normalize(input.email);
  const role = normalize(input.role);
  const expiresInDays =
    typeof input.expiresInDays === "number" ? input.expiresInDays : undefined;

  if (!organizationId)
    return { ok: false, error: "Falta el ID de la organización." };
  if (!email) return { ok: false, error: "El email es obligatorio." };
  if (!role) return { ok: false, error: "El rol es obligatorio." };

  try {
    await postJson(`/organizations/${organizationId}/invites`, {
      email,
      role,
      expires_in_days: expiresInDays,
    });
    revalidatePath(`/module/organizations/${organizationId}`);
    revalidatePath("/module/organizations");
    revalidatePath("/setup");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function revokeOrganizationInviteAction(input: {
  organizationId: string;
  inviteId: string;
}): Promise<ActionResult> {
  const organizationId = normalize(input.organizationId);
  const inviteId = normalize(input.inviteId);

  if (!organizationId)
    return { ok: false, error: "Falta el ID de la organización." };
  if (!inviteId) return { ok: false, error: "Falta el ID de la invitación." };

  try {
    await deleteJson(`/organizations/${organizationId}/invites/${inviteId}`);
    revalidatePath(`/module/organizations/${organizationId}`);
    revalidatePath("/module/organizations");
    revalidatePath("/setup");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
