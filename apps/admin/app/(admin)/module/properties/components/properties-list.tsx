"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertyNotionTable } from "@/components/properties/property-notion-table";
import type { PortfolioPropertyRow } from "@/lib/portfolio-overview";

type PropertiesListProps = {
  rows: PortfolioPropertyRow[];
  isEn: boolean;
  askAiHref: (row: PortfolioPropertyRow) => string;
};

export function PropertiesList({
  rows,
  isEn,
  askAiHref,
}: PropertiesListProps) {
  const [displayMode, setDisplayMode] = useState<"table" | "cards">("table");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {rows.length} {isEn ? "properties in view" : "propiedades en vista"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setDisplayMode("table")}
            size="sm"
            type="button"
            variant={displayMode === "table" ? "default" : "outline"}
          >
            {isEn ? "Table" : "Tabla"}
          </Button>
          <Button
            onClick={() => setDisplayMode("cards")}
            size="sm"
            type="button"
            variant={displayMode === "cards" ? "default" : "outline"}
          >
            {isEn ? "Cards" : "Tarjetas"}
          </Button>
        </div>
      </div>

      {displayMode === "table" ? (
        <PropertyNotionTable askAiHref={askAiHref} isEn={isEn} rows={rows} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((row) => (
            <PropertyCard
              askAiHref={askAiHref(row)}
              isEn={isEn}
              key={row.id}
              row={row}
            />
          ))}
        </div>
      )}
    </section>
  );
}
