"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { patchJson, postJson } from "@/lib/api";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNext(path: string, fallback: string): string {
  const next = path.trim();
  if (!next.startsWith("/")) return fallback;
  return next;
}

function withParams(
  path: string,
  params: { success?: string; error?: string }
): string {
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

function listingsUrl(params?: { success?: string; error?: string }): string {
  return withParams("/module/marketplace-listings", params ?? {});
}

export async function createMarketplaceListingAction(formData: FormData) {
  const organization_id = toStringValue(formData.get("organization_id"));
  if (!organization_id) {
    redirect(listingsUrl({ error: "Missing organization context." }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    listingsUrl()
  );

  const title = toStringValue(formData.get("title"));
  const public_slug = toStringValue(formData.get("public_slug"));

  if (!title) {
    redirect(withParams(next, { error: "title is required" }));
  }
  if (!public_slug) {
    redirect(withParams(next, { error: "public_slug is required" }));
  }

  const payload: Record<string, unknown> = {
    organization_id,
    title,
    public_slug,
    city: toStringValue(formData.get("city")) || "Asuncion",
    country_code: toStringValue(formData.get("country_code")) || "PY",
    currency: (toStringValue(formData.get("currency")) || "PYG").toUpperCase(),
  };

  const summary = toStringValue(formData.get("summary"));
  const description = toStringValue(formData.get("description"));
  const neighborhood = toStringValue(formData.get("neighborhood"));
  const pricing_template_id = toStringValue(
    formData.get("pricing_template_id")
  );
  const property_id = toStringValue(formData.get("property_id"));
  const unit_id = toStringValue(formData.get("unit_id"));

  if (summary) payload.summary = summary;
  if (description) payload.description = description;
  if (neighborhood) payload.neighborhood = neighborhood;
  if (pricing_template_id) payload.pricing_template_id = pricing_template_id;
  if (property_id) payload.property_id = property_id;
  if (unit_id) payload.unit_id = unit_id;

  try {
    await postJson("/marketplace/listings", payload);
    revalidatePath("/module/marketplace-listings");
    revalidatePath("/marketplace");
    redirect(withParams(next, { success: "marketplace-listing-created" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function publishMarketplaceListingAction(formData: FormData) {
  const marketplace_listing_id = toStringValue(
    formData.get("marketplace_listing_id")
  );
  if (!marketplace_listing_id) {
    redirect(listingsUrl({ error: "marketplace_listing_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    listingsUrl()
  );

  try {
    await postJson(
      `/marketplace/listings/${encodeURIComponent(marketplace_listing_id)}/publish`,
      {}
    );
    revalidatePath("/module/marketplace-listings");
    revalidatePath("/marketplace");
    redirect(withParams(next, { success: "marketplace-listing-published" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}

export async function unpublishMarketplaceListingAction(formData: FormData) {
  const marketplace_listing_id = toStringValue(
    formData.get("marketplace_listing_id")
  );
  if (!marketplace_listing_id) {
    redirect(listingsUrl({ error: "marketplace_listing_id is required" }));
  }

  const next = normalizeNext(
    toStringValue(formData.get("next")),
    listingsUrl()
  );

  try {
    await patchJson(
      `/marketplace/listings/${encodeURIComponent(marketplace_listing_id)}`,
      { is_published: false }
    );
    revalidatePath("/module/marketplace-listings");
    revalidatePath("/marketplace");
    redirect(withParams(next, { success: "marketplace-listing-unpublished" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(withParams(next, { error: message.slice(0, 240) }));
  }
}
