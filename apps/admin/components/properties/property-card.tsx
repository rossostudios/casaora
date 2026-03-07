"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PortfolioPropertyRow } from "@/lib/portfolio-overview";

type PropertyCardProps = {
  row: PortfolioPropertyRow;
  isEn: boolean;
  askAiHref: string;
};

export function PropertyCard({ row, isEn, askAiHref }: PropertyCardProps) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-base">{row.name}</h3>
          <p className="text-muted-foreground text-sm">
            {[row.address, row.city].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <Badge
          className={
            row.health === "critical"
              ? "border-red-500/20 bg-red-500/10 text-red-600"
              : row.health === "watch"
                ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
          }
          variant="outline"
        >
          {row.health}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-muted-foreground text-xs">
            {isEn ? "Units" : "Unidades"}
          </p>
          <p className="font-semibold">
            {row.occupiedUnits}/{row.totalUnits}
          </p>
        </div>
        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-muted-foreground text-xs">
            {isEn ? "Open tasks" : "Tareas abiertas"}
          </p>
          <p className="font-semibold">{row.openTasks}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={row.unitsHref}>{isEn ? "View units" : "Ver unidades"}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={row.primaryHref}>{isEn ? "Open property" : "Abrir propiedad"}</Link>
        </Button>
      </div>
    </article>
  );
}
