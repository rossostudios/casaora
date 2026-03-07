"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { cn } from "@/lib/utils";

type Category = {
  key: string;
  label: { "en-US": string; "es-PY": string };
  params: Record<string, string>;
};

const CATEGORIES: readonly Category[] = [
  {
    key: "all",
    label: { "en-US": "All", "es-PY": "Todos" },
    params: {},
  },
  {
    key: "available-now",
    label: { "en-US": "Move-in ready", "es-PY": "Disponible ya" },
    params: { available_now: "true" },
  },
  {
    key: "apartment",
    label: { "en-US": "Apartments", "es-PY": "Departamentos" },
    params: { property_type: "apartment" },
  },
  {
    key: "house",
    label: { "en-US": "Houses", "es-PY": "Casas" },
    params: { property_type: "house" },
  },
  {
    key: "studio",
    label: { "en-US": "Studios", "es-PY": "Monoambientes" },
    params: { property_type: "studio" },
  },
  {
    key: "furnished",
    label: { "en-US": "Furnished", "es-PY": "Amoblados" },
    params: { furnished: "true" },
  },
  {
    key: "pet-friendly",
    label: { "en-US": "Pet-Friendly", "es-PY": "Acepta mascotas" },
    params: { pet_policy: "allowed" },
  },
  {
    key: "under-2m",
    label: { "en-US": "Under ₲2M", "es-PY": "Bajo ₲2M" },
    params: { max_monthly: "2000000" },
  },
];

function resolveActiveKey(searchParams: URLSearchParams): string {
  const propertyType = searchParams.get("property_type") || "";
  const furnished = searchParams.get("furnished") || "";
  const petPolicy = searchParams.get("pet_policy") || "";
  const availableNow = searchParams.get("available_now") || "";
  const maxMonthly = searchParams.get("max_monthly") || "";

  if (availableNow === "true") return "available-now";
  if (petPolicy) return "pet-friendly";
  if (furnished === "true") return "furnished";
  if (maxMonthly === "2000000") return "under-2m";
  if (propertyType === "apartment") return "apartment";
  if (propertyType === "house") return "house";
  if (propertyType === "studio") return "studio";
  return "all";
}

export function CategoryPills({ locale }: { locale: "es-PY" | "en-US" }) {
  return (
    <Suspense fallback={null}>
      <CategoryPillsInner locale={locale} />
    </Suspense>
  );
}

function CategoryPillsInner({ locale }: { locale: "es-PY" | "en-US" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeKey = resolveActiveKey(searchParams);

  const handleClick = useCallback(
    (category: Category) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("property_type");
      params.delete("furnished");
      params.delete("pet_policy");
      params.delete("available_now");
      params.delete("max_monthly");

      for (const [key, value] of Object.entries(category.params)) {
        params.set(key, value);
      }

      const query = params.toString();
      router.replace(`/marketplace${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORIES.map((category) => {
        const active = activeKey === category.key;
        return (
          <button
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 font-medium text-sm transition-all duration-200",
              active
                ? "border-[var(--marketplace-text)]/15 bg-[var(--marketplace-text)]/8 text-[var(--marketplace-text)]"
                : "border-transparent text-[var(--marketplace-text-muted)] hover:border-[var(--marketplace-text)]/8 hover:text-[var(--marketplace-text)]"
            )}
            key={category.key}
            onClick={() => handleClick(category)}
            type="button"
          >
            {category.label[locale]}
          </button>
        );
      })}
    </div>
  );
}
