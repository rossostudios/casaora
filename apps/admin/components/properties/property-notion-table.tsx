"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updatePropertyInlineAction } from "@/app/(admin)/module/properties/actions";
import { EditableCell } from "@/components/properties/editable-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PortfolioPropertyRow } from "@/lib/portfolio-overview";

type PropertyNotionTableProps = {
  rows: PortfolioPropertyRow[];
  isEn: boolean;
  askAiHref: (row: PortfolioPropertyRow) => string;
};

export function PropertyNotionTable({
  rows,
  isEn,
  askAiHref,
}: PropertyNotionTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function saveField(
    propertyId: string,
    field: string,
    value: string
  ): Promise<void> {
    const result = await updatePropertyInlineAction({ propertyId, field, value });
    if (!result.ok) {
      toast.error(isEn ? "Could not save property" : "No se pudo guardar", {
        description: result.error,
      });
      return;
    }

    toast.success(isEn ? "Property updated" : "Propiedad actualizada");
    startTransition(() => router.refresh());
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isEn ? "Property" : "Propiedad"}</TableHead>
            <TableHead>{isEn ? "Status" : "Estado"}</TableHead>
            <TableHead>{isEn ? "Type" : "Tipo"}</TableHead>
            <TableHead>{isEn ? "Units" : "Unidades"}</TableHead>
            <TableHead>{isEn ? "Open tasks" : "Tareas abiertas"}</TableHead>
            <TableHead>{isEn ? "Collections" : "Cobros"}</TableHead>
            <TableHead>{isEn ? "Health" : "Salud"}</TableHead>
            <TableHead className="text-right">{isEn ? "Actions" : "Acciones"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="min-w-[14rem] align-top">
                <div className="space-y-1">
                  <EditableCell
                    displayNode={
                      <div className="space-y-1">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {[row.address, row.city].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    }
                    onCommit={(next) => saveField(row.id, "name", next)}
                    value={row.name}
                  />
                </div>
              </TableCell>
              <TableCell className="align-top">
                <StatusBadge value={row.status ?? "active"} />
              </TableCell>
              <TableCell className="align-top">
                <Badge variant="outline">
                  {row.propertyType?.replaceAll("_", " ") || (isEn ? "Not set" : "Sin tipo")}
                </Badge>
              </TableCell>
              <TableCell className="align-top">
                <p className="font-medium">
                  {row.occupiedUnits}/{row.totalUnits}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isEn ? "occupied / total" : "ocupadas / total"}
                </p>
              </TableCell>
              <TableCell className="align-top">{row.openTasks}</TableCell>
              <TableCell className="align-top">
                <Badge
                  className={
                    row.collectionsRisk === "high"
                      ? "border-red-500/20 bg-red-500/10 text-red-600"
                      : row.collectionsRisk === "watch"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                        : "border-border/60 bg-muted/40 text-muted-foreground"
                  }
                  variant="outline"
                >
                  {row.collectionsRisk}
                </Badge>
              </TableCell>
              <TableCell className="align-top">
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
              </TableCell>
              <TableCell className="align-top">
                <div className="flex justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={row.unitsHref}>
                      {isEn ? "View units" : "Ver unidades"}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={askAiHref(row)}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={row.primaryHref}>
                      {isEn ? "Open" : "Abrir"}
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
