const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

const PUBLIC_CACHE_REVALIDATE_SECONDS = 120;
const FX_CACHE_REVALIDATE_SECONDS = 3600;
const DEFAULT_API_TIMEOUT_MS = 15_000;

async function fetchPublicJson<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  init?: RequestInit
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEFAULT_API_TIMEOUT_MS
  );

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      ...init,
    });
    if (!res.ok) {
      throw new Error(`API ${path} failed (${res.status})`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function fetchPublicListings(params?: {
  city?: string;
  neighborhood?: string;
  q?: string;
  propertyType?: string;
  furnished?: boolean;
  petPolicy?: string;
  minParking?: number;
  minMonthly?: number;
  maxMonthly?: number;
  minMoveIn?: number;
  maxMoveIn?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  orgId?: string;
  limit?: number;
}): Promise<{ data?: Record<string, unknown>[] }> {
  return fetchPublicJson<{ data?: Record<string, unknown>[] }>(
    "/public/listings",
    {
      city: params?.city,
      neighborhood: params?.neighborhood,
      q: params?.q,
      property_type: params?.propertyType,
      furnished: params?.furnished,
      pet_policy: params?.petPolicy,
      min_parking: params?.minParking,
      min_monthly: params?.minMonthly,
      max_monthly: params?.maxMonthly,
      min_move_in: params?.minMoveIn,
      max_move_in: params?.maxMoveIn,
      min_bedrooms: params?.minBedrooms,
      min_bathrooms: params?.minBathrooms,
      org_id: params?.orgId,
      limit: params?.limit ?? 60,
    },
    {
      cache: "force-cache",
      next: { revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS },
    }
  );
}

export function fetchPublicListing(
  slug: string
): Promise<Record<string, unknown>> {
  return fetchPublicJson<Record<string, unknown>>(
    `/public/listings/${encodeURIComponent(slug)}`,
    undefined,
    {
      cache: "force-cache",
      next: { revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS },
    }
  );
}

export async function fetchUsdPygRate(): Promise<number> {
  try {
    const data = await fetchPublicJson<{ usd_pyg: number }>(
      "/public/fx/usd-pyg",
      undefined,
      {
        cache: "force-cache",
        next: { revalidate: FX_CACHE_REVALIDATE_SECONDS },
      }
    );
    if (data.usd_pyg && data.usd_pyg > 0) return data.usd_pyg;
  } catch {
    /* fall through to default */
  }
  return 7500;
}
