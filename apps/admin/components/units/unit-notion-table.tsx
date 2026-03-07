"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  deleteUnitFromUnitsModuleAction,
  updateUnitInlineAction,
} from "@/app/(admin)/module/units/actions";
import { EditableCell } from "@/components/properties/editable-cell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PortfolioUnitRow } from "@/lib/portfolio-overview";

export function UnitNotionTable({
  rows,
  isEn,
  selectedIds,
  onSelectedIdsChange,
  onOpenBulkUpdate,
  onOpenCreate,
  askAiHref,
}: {
  rows: PortfolioUnitRow[];
  isEn: boolean;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onOpenBulkUpdate: () => void;
  onOpenCreate: () => void;
  askAiHref: (row: PortfolioUnitRow) => string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const selectedSet = new Set(selectedIds);

  function toggleRow(unitId: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(unitId);
    else next.delete(unitId);
    onSelectedIdsChange(Array.from(next));
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      onSelectedIdsChange(rows.map((row) => row.id));
      return;
    }
    onSelectedIdsChange([]);
  }

  async function saveField(
    unitId: string,
    field: string,
    value: string | number
  ): Promise<void> {
    const result = await updateUnitInlineAction({ unitId, field, value });
    if (!result.ok) {
      toast.error(isEn ? "Could not save unit" : "No se pudo guardar", {
        description: result.error,
      });
      return;
    }
    toast.success(isEn ? "Unit updated" : "Unidad actualizada");
    startTransition(() => router.refresh());
  }

  async function deleteRow(row: PortfolioUnitRow): Promise<void> {
    const confirmed = window.confirm(
      isEn
        ? `Delete unit ${row.code}?`
        : `¿Eliminar la unidad ${row.code}?`
    );
    if (!confirmed) return;

    const result = await deleteUnitFromUnitsModuleAction({
      propertyId: row.propertyId,
      unitId: row.id,
    });
    if (!result.ok) {
      toast.error(isEn ? "Could not delete unit" : "No se pudo eliminar", {
        description: result.error,
      });
      return;
    }

    onSelectedIdsChange(selectedIds.filter((value) => value !== row.id));
    toast.success(isEn ? "Unit deleted" : "Unidad eliminada");
    startTransition(() => router.refresh());
  }

  const allSelected = rows.length > 0 && rows.every((row) => selectedSet.has(row.id));

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-4">
          <p className="text-muted-foreground text-sm">
            {selectedIds.length} {isEn ? "units selected" : "unidades seleccionadas"}
          </p>
          <Button onClick={onOpenBulkUpdate} size="sm" type="button">
            {isEn ? "Bulk update" : "Actualizar"}
          </Button>
          <Button
            onClick={() => onSelectedIdsChange([])}
            size="sm"
            type="button"
            variant="outline"
          >
            {isEn ? "Clear selection" : "Limpiar selección"}
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                />
              </TableHead>
              <TableHead>{isEn ? "Unit" : "Unidad"}</TableHead>
              <TableHead>{isEn ? "Property" : "Propiedad"}</TableHead>
              <TableHead>{isEn ? "Status" : "Estado"}</TableHead>
              <TableHead>{isEn ? "Condition" : "Condición"}</TableHead>
              <TableHead>{isEn ? "Lease" : "Contrato"}</TableHead>
              <TableHead>{isEn ? "Rent" : "Renta"}</TableHead>
              <TableHead className="text-right">{isEn ? "Actions" : "Acciones"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedSet.has(row.id)}
                    onCheckedChange={(checked) => toggleRow(row.id, Boolean(checked))}
                  />
                </TableCell>
                <TableCell className="min-w-[12rem] align-top">
                  <div className="space-y-1">
                    <p className="font-medium">{row.code}</p>
                    <EditableCell
                      displayNode={
                        <p className="text-muted-foreground text-xs">
                          {row.name || (isEn ? "Unnamed unit" : "Unidad sin nombre")}
                        </p>
                      }
                      onCommit={(next) => saveField(row.id, "name", next)}
                      value={row.name ?? ""}
                    />
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Link
                    className="text-primary text-sm hover:underline"
                    href={row.propertyHref}
                  >
                    {row.propertyName}
                  </Link>
                </TableCell>
                <TableCell className="align-top">
                  <StatusBadge value={row.status ?? "active"} />
                </TableCell>
                <TableCell className="align-top">{row.conditionStatus || "—"}</TableCell>
                <TableCell className="align-top">{row.leaseState}</TableCell>
                <TableCell className="align-top">
                  {row.rentAmount > 0 ? `${row.currency} ${row.rentAmount}` : "—"}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={askAiHref(row)}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={row.primaryHref}>{isEn ? "Open" : "Abrir"}</Link>
                    </Button>
                    <Button
                      onClick={() => deleteRow(row)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {isEn ? "Delete" : "Eliminar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={8}>
                <Button
                  className="w-full justify-start"
                  onClick={onOpenCreate}
                  type="button"
                  variant="ghost"
                >
                  + {isEn ? "Create unit" : "Crear unidad"}
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
