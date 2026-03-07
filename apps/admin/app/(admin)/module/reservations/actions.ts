"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { deleteJson, patchJson, postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeNext(path: string, fallback: string): string {
  const next = path.trim();
  if (!next.startsWith("/")) return fallback;
  return next;
}

function withParams(path: string, params: { success?: string; error?: string }): string {
  const [base, query] = path.split("?", 2);
  const qs = new URLSearchParams(query ?? "");

  if (params.success) {
    qs.set("success", params.success);
    qs.delete("error");
  }
  if (params.error) {
    qs.set("error", params.error);
    qs.delete("success");
  }

  const suffix = qs.toString();
  return suffix ? `${base}?${suffix}` : base;
}

function reservationsUrl(params?: { success?: string; error?: string }): string {
  return withParams("/module/reservations", params ?? {});
}

function revalidateReservationPaths(reservationId?: string) {
  revalidatePath("/module/reservations");
  revalidatePath("/module/calendar");
  revalidatePath("/module/tasks");
  revalidatePath("/module/expenses");
  if (reservationId) {
    revalidatePath(`/module/reservations/${reservationId}`);
  }
}

async function createGuestFromForm(
  organization_id: string,
  formData: FormData
): Promise<string | null> {
  const full_name = toStringValue(formData.get("guest_full_name"));
  if (!full_name) return null;

  const payload: Record<string, unknown> = {
    organization_id,
    full_name,
    preferred_language: toStringValue(formData.get("guest_preferred_language")) || "es",
  };

  const email = toStringValue(formData.get("guest_email"));
  const phone_e164 = toStringValue(formData.get("guest_phone_e164"));
  const country_code = toStringValue(formData.get("guest_country_code"));
  const notes = toStringValue(formData.get("guest_notes"));

  if (email) payload.email = email;
  if (phone_e164) payload.phone_e164 = phone_e164;
  if (country_code) payload.country_code = country_code;
  if (notes) payload.notes = notes;

  const created = (await postJson("/guests", payload)) as { id?: string } | undefined;
  return typeof created?.id === "string" ? created.id : null;
}

export async function createReservationAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  const unit_id = toStringValue(formData.get("unit_id"));
  const check_in_date = toStringValue(formData.get("check_in_date"));
  const check_out_date = toStringValue(formData.get("check_out_date"));
  const total_amount = toOptionalNumber(formData.get("total_amount"));

  if (!organization_id) {
    redirect(reservationsUrl({ error: "Missing organization context." }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    reservationsUrl(),
  );

  if (!unit_id) {
    redirect(withParams(next, { error: "unit_id is required" }));
  }
  if (!check_in_date || !check_out_date) {
    redirect(
      withParams(next, { error: "check_in_date and check_out_date are required" }),
    );
  }
  if (total_amount === undefined) {
    redirect(withParams(next, { error: "total_amount is required" }));
  }

  const payload: Record<string, unknown> = {
    organization_id,
    unit_id,
    check_in_date,
    check_out_date,
    total_amount,
    source: toStringValue(formData.get("source")) || "manual",
    status: toStringValue(formData.get("status")) || "pending",
    currency: (toStringValue(formData.get("currency")) || "PYG").toUpperCase(),
    adults: toOptionalNumber(formData.get("adults")) ?? 1,
    children: toOptionalNumber(formData.get("children")) ?? 0,
    infants: toOptionalNumber(formData.get("infants")) ?? 0,
    pets: toOptionalNumber(formData.get("pets")) ?? 0,
    nightly_rate: toOptionalNumber(formData.get("nightly_rate")) ?? 0,
    cleaning_fee: toOptionalNumber(formData.get("cleaning_fee")) ?? 0,
    tax_amount: toOptionalNumber(formData.get("tax_amount")) ?? 0,
    extra_fees: toOptionalNumber(formData.get("extra_fees")) ?? 0,
    discount_amount: toOptionalNumber(formData.get("discount_amount")) ?? 0,
    amount_paid: toOptionalNumber(formData.get("amount_paid")) ?? 0,
  };

  const payment_method = toStringValue(formData.get("payment_method"));
  const notes = toStringValue(formData.get("notes"));
  const guest_id = toStringValue(formData.get("guest_id"));
  const guest_full_name = toStringValue(formData.get("guest_full_name"));

  if (payment_method) payload.payment_method = payment_method;
  if (notes) payload.notes = notes;
  if (!guest_id && !guest_full_name) {
    redirect(withParams(next, { error: "Link or create a guest first." }));
  }

  try {
    const linkedGuestId = guest_id || (await createGuestFromForm(organization_id, formData));
    if (linkedGuestId) {
      payload.guest_id = linkedGuestId;
    }

    const created = (await postJson("/reservations", payload)) as { id?: string } | undefined;
    const reservationId = typeof created?.id === "string" ? created.id : "";

    revalidateReservationPaths(reservationId || undefined);
    revalidatePath("/module/guests");
    redirect(
      withParams(
        reservationId
          ? `/module/reservations/${reservationId}?return_to=${encodeURIComponent(next)}`
          : next,
        { success: "reservation-created" },
      ),
    );
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function updateReservationAction(formData: FormData) {
  const reservation_id = toStringValue(formData.get("reservation_id"));
  if (!reservation_id) {
    redirect(reservationsUrl({ error: "reservation_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    `/module/reservations/${reservation_id}`,
  );

  const organization_id = toStringValue(formData.get("organization_id"));
  const payload: Record<string, unknown> = {
    amount_paid: toOptionalNumber(formData.get("amount_paid")) ?? 0,
    payment_method: toStringValue(formData.get("payment_method")) || null,
    notes: toStringValue(formData.get("notes")) || null,
    deposit_amount: toOptionalNumber(formData.get("deposit_amount")) ?? 0,
    deposit_status: toStringValue(formData.get("deposit_status")) || null,
  };

  try {
    const existingGuestId = toStringValue(formData.get("guest_id"));
    const createdGuestId =
      !existingGuestId && organization_id
        ? await createGuestFromForm(organization_id, formData)
        : null;
    payload.guest_id = existingGuestId || createdGuestId || null;

    await patchJson(`/reservations/${encodeURIComponent(reservation_id)}`, payload);
    revalidateReservationPaths(reservation_id);
    if (createdGuestId) revalidatePath("/module/guests");
    redirect(withParams(next, { success: "reservation-updated" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function createCalendarBlockAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  const unit_id = toStringValue(formData.get("unit_id"));
  const starts_on = toStringValue(formData.get("starts_on"));
  const ends_on = toStringValue(formData.get("ends_on"));
  const reason = toStringValue(formData.get("reason")) || undefined;

  if (!organization_id) {
    redirect(reservationsUrl({ error: "Missing organization context." }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    reservationsUrl(),
  );

  if (!unit_id) {
    redirect(withParams(next, { error: "unit_id is required" }));
  }
  if (!(starts_on && ends_on)) {
    redirect(withParams(next, { error: "starts_on and ends_on are required" }));
  }

  try {
    await postJson("/calendar/blocks", {
      organization_id,
      unit_id,
      starts_on,
      ends_on,
      source: "manual",
      ...(reason ? { reason } : {}),
    });

    revalidateReservationPaths();
    redirect(withParams(next, { success: "block-created" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function deleteCalendarBlockAction(formData: FormData) {
  const block_id = toStringValue(formData.get("block_id"));
  const next = normalizeNext(
    toStringValue(formData.get("next")),
    reservationsUrl(),
  );

  if (!block_id) {
    redirect(withParams(next, { error: "block_id is required" }));
  }

  try {
    await deleteJson(`/calendar/blocks/${encodeURIComponent(block_id)}`);
    revalidateReservationPaths();
    redirect(withParams(next, { success: "block-deleted" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function transitionReservationStatusAction(formData: FormData) {
  const reservation_id = toStringValue(formData.get("reservation_id"));
  const status = toStringValue(formData.get("status"));
  const reason = toStringValue(formData.get("reason")) || undefined;

  if (!reservation_id) {
    redirect(reservationsUrl({ error: "reservation_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    reservationsUrl(),
  );

  if (!status) {
    redirect(withParams(next, { error: "status is required" }));
  }

  try {
    await postJson(
      `/reservations/${encodeURIComponent(reservation_id)}/status`,
      {
        status,
        ...(reason ? { reason } : {}),
      },
    );

    revalidateReservationPaths(reservation_id);
    redirect(withParams(next, { success: "reservation-updated" }));
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function bulkTransitionReservationStatusAction(
  reservationIds: string[],
  status: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of reservationIds) {
    try {
      await postJson(`/reservations/${encodeURIComponent(id)}/status`, { status });
      success++;
    } catch {
      failed++;
    }
  }

  revalidateReservationPaths();
  return { success, failed };
}
