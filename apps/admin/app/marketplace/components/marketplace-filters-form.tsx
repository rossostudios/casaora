"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  FilterHorizontalIcon,
  Home01Icon,
  Location01Icon,
  Search01Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { MarketplaceSearchFilters } from "@/lib/features/marketplace/query";
import { cn } from "@/lib/utils";

type MarketplaceFiltersFormProps = {
  isEn: boolean;
  filters: MarketplaceSearchFilters;
  activeFilters: number;
  sortLabel: string;
};

export function MarketplaceFiltersForm({
  isEn,
  filters,
  activeFilters,
  sortLabel,
}: MarketplaceFiltersFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#e8e4df]">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <button
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--marketplace-text-muted)] transition-colors hover:text-[var(--marketplace-text)]"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <Icon icon={FilterHorizontalIcon} size={15} />
          <span className="font-serif">{isEn ? "Refine your search" : "Refinar búsqueda"}</span>
          {activeFilters > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-semibold text-[10px] text-white">
              {activeFilters}
            </span>
          ) : null}
          <Icon
            className="text-[var(--marketplace-text-muted)]"
            icon={open ? ArrowUp01Icon : ArrowDown01Icon}
            size={14}
          />
        </button>

        <div className="flex items-center gap-2 text-xs text-[var(--marketplace-text-muted)]">
          <span>{isEn ? "Sort" : "Orden"}:</span>
          <form id="marketplace-sort-form">
            <select
              className="rounded-lg border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-2 py-1 text-xs text-[var(--marketplace-text)] outline-none"
              defaultValue={filters.sort}
              name="sort"
              onChange={(e) => {
                const form = e.target.closest("form");
                if (form) form.requestSubmit();
              }}
            >
              <option value="featured">
                {isEn ? "Featured" : "Destacados"}
              </option>
              <option value="newest">
                {isEn ? "Newest first" : "Más nuevos"}
              </option>
              <option value="move_in_desc">
                {isEn ? "Move-in high" : "Ingreso mayor"}
              </option>
              <option value="move_in_asc">
                {isEn ? "Move-in low" : "Ingreso menor"}
              </option>
              <option value="monthly_desc">
                {isEn ? "Monthly high" : "Mensual mayor"}
              </option>
              <option value="monthly_asc">
                {isEn ? "Monthly low" : "Mensual menor"}
              </option>
            </select>
          </form>
        </div>
      </div>

      <form
        className={cn(
          "overflow-hidden transition-all",
          open ? "px-5 pb-5 pt-2" : "h-0 p-0"
        )}
        id="marketplace-filters"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3 sm:col-span-2">
            <Icon
              className="text-[var(--marketplace-text-muted)]"
              icon={Search01Icon}
              size={17}
            />
            <Input
              className="h-full w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.q}
              name="q"
              placeholder={
                isEn ? "Search title or neighborhood" : "Buscar titulo o barrio"
              }
              type="text"
            />
          </label>

          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <Icon
              className="text-[var(--marketplace-text-muted)]"
              icon={Location01Icon}
              size={16}
            />
            <Input
              className="h-full w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.city}
              name="city"
              placeholder={isEn ? "City" : "Ciudad"}
              type="text"
            />
          </label>

          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <Icon
              className="text-[var(--marketplace-text-muted)]"
              icon={Home01Icon}
              size={16}
            />
            <Input
              className="h-full w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.neighborhood}
              name="neighborhood"
              placeholder={isEn ? "Neighborhood" : "Barrio"}
              type="text"
            />
          </label>

          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <Icon
              className="text-[var(--marketplace-text-muted)]"
              icon={Home01Icon}
              size={16}
            />
            <select
              className="h-full w-full min-w-0 bg-transparent text-sm outline-none"
              defaultValue={filters.propertyType || ""}
              name="property_type"
            >
              <option value="">
                {isEn ? "Property type" : "Tipo de propiedad"}
              </option>
              <option value="apartment">
                {isEn ? "Apartment" : "Departamento"}
              </option>
              <option value="house">{isEn ? "House" : "Casa"}</option>
              <option value="studio">{isEn ? "Studio" : "Monoambiente"}</option>
            </select>
          </label>

          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <Icon
              className="text-[var(--marketplace-text-muted)]"
              icon={Home01Icon}
              size={16}
            />
            <select
              className="h-full w-full min-w-0 bg-transparent text-sm outline-none"
              defaultValue={
                filters.furnished === undefined
                  ? ""
                  : filters.furnished
                    ? "true"
                    : "false"
              }
              name="furnished"
            >
              <option value="">{isEn ? "Furnished?" : "¿Amoblado?"}</option>
              <option value="true">{isEn ? "Furnished" : "Amoblado"}</option>
              <option value="false">
                {isEn ? "Unfurnished" : "Sin amoblar"}
              </option>
            </select>
          </label>

          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <Icon
              className="text-[var(--marketplace-text-muted)]"
              icon={Wallet02Icon}
              size={16}
            />
            <Input
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.minMonthly ?? ""}
              min={0}
              name="min_monthly"
              placeholder={isEn ? "Min" : "Min"}
              type="number"
            />
            <span className="text-[var(--marketplace-text-muted)] text-xs">-</span>
            <Input
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.maxMonthly ?? ""}
              min={0}
              name="max_monthly"
              placeholder={isEn ? "Max" : "Max"}
              type="number"
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <span className="text-[var(--marketplace-text-muted)] text-xs">
              {isEn ? "Beds" : "Hab"}
            </span>
            <Input
              className="h-full w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.minBedrooms ?? ""}
              min={0}
              name="min_bedrooms"
              placeholder="0"
              type="number"
            />
          </label>

          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <span className="text-[var(--marketplace-text-muted)] text-xs">
              {isEn ? "Baths" : "Baños"}
            </span>
            <Input
              className="h-full w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.minBathrooms ?? ""}
              min={0}
              name="min_bathrooms"
              placeholder="0"
              step="0.5"
              type="number"
            />
          </label>

          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <span className="text-[var(--marketplace-text-muted)] text-xs">
              {isEn ? "Parking" : "Estac."}
            </span>
            <Input
              className="h-full w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.minParking ?? ""}
              min={0}
              name="min_parking"
              placeholder="0"
              type="number"
            />
          </label>

          <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#e8e4df] bg-[var(--marketplace-bg-muted)] px-3">
            <span className="text-[var(--marketplace-text-muted)] text-xs">
              {isEn ? "Pets" : "Mascotas"}
            </span>
            <Input
              className="h-full w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              defaultValue={filters.petPolicy}
              name="pet_policy"
              placeholder={isEn ? "Any" : "Cualquier"}
              type="text"
            />
          </label>

          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-casaora-gradient-warm px-4 font-medium text-white text-sm transition-opacity hover:opacity-90"
            type="submit"
          >
            {isEn ? "Apply" : "Aplicar"}
          </button>

          <Link
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#e8e4df] bg-white px-4 font-medium text-sm text-[var(--marketplace-text-muted)] transition-colors hover:text-[var(--marketplace-text)]"
            href="/marketplace"
          >
            {isEn ? "Reset" : "Limpiar"}
          </Link>
        </div>
      </form>
    </div>
  );
}
