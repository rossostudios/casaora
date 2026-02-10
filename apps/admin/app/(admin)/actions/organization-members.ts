"use server";

import { revalidatePath } from "next/cache";

import { deleteJson, patchJson, postJson } from "@/lib/api";

type ActionResult = { ok: true } | { ok: false; error: string };

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function addOrganizationMemberAction(input: {
  organizationId: string;
  userId: string;
  role: string;
}): Promise<ActionResult> {
  const organizationId = normalize(input.organizationId);
  const userId = normalize(input.userId);
  const role = normalize(input.role);

  if (!organizationId)
    return { ok: false, error: "Falta el ID de la organización." };
  if (!userId) return { ok: false, error: "El ID de usuario es obligatorio." };
  if (!role) return { ok: false, error: "El rol es obligatorio." };

  try {
    await postJson(`/organizations/${organizationId}/members`, {
      user_id: userId,
      role,
      is_primary: false,
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

export async function updateOrganizationMemberAction(input: {
  organizationId: string;
  userId: string;
  role?: string;
  isPrimary?: boolean;
}): Promise<ActionResult> {
  const organizationId = normalize(input.organizationId);
  const userId = normalize(input.userId);
  const role = normalize(input.role);

  if (!organizationId)
    return { ok: false, error: "Falta el ID de la organización." };
  if (!userId) return { ok: false, error: "Falta el ID del miembro." };

  const payload: Record<string, unknown> = {};
  if (role) payload.role = role;
  if (typeof input.isPrimary === "boolean")
    payload.is_primary = input.isPrimary;
  if (!Object.keys(payload).length) return { ok: true };

  try {
    await patchJson(
      `/organizations/${organizationId}/members/${userId}`,
      payload
    );
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

export async function removeOrganizationMemberAction(input: {
  organizationId: string;
  userId: string;
}): Promise<ActionResult> {
  const organizationId = normalize(input.organizationId);
  const userId = normalize(input.userId);

  if (!organizationId)
    return { ok: false, error: "Falta el ID de la organización." };
  if (!userId) return { ok: false, error: "Falta el ID del miembro." };

  try {
    await deleteJson(`/organizations/${organizationId}/members/${userId}`);
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
