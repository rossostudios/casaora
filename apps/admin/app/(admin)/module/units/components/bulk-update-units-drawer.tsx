"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  bulkUpdateUnitsFromUnitsModuleAction,
  type BulkUpdateUnitsResult,
} from "@/app/(admin)/module/units/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type BulkUpdateUnitsDrawerProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  orgId: string;
  isEn: boolean;
  selectedUnits: Array<{ id: string; code: string; propertyId?: string | null }>;
  propertyId?: string | null;
  onApplied?: () => void;
};

type PatchDraft = {
  condition_status: string;
  floor_level: string;
  unit_type: string;
  base_price_monthly: string;
  is_active: string;
};

const EMPTY_PATCH: PatchDraft = {
  condition_status: "",
  floor_level: "",
  unit_type: "",
  base_price_monthly: "",
  is_active: "",
};

export function BulkUpdateUnitsDrawer({
  open,
  onOpenChange,
  orgId,
  isEn,
  selectedUnits,
  propertyId,
  onApplied,
}: BulkUpdateUnitsDrawerProps) {
  const [patch, setPatch] = useState<PatchDraft>(EMPTY_PATCH);
  const [preview, setPreview] = useState<Extract<BulkUpdateUnitsResult, { ok: true; dryRun: true }> | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);

  function updatePatch<K extends keyof PatchDraft>(key: K, value: PatchDraft[K]) {
    setPatch((current) => ({ ...current, [key]: value }));
  }

  function buildPatch(): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    if (patch.condition_status) next.condition_status = patch.condition_status;
    if (patch.floor_level) next.floor_level = Number(patch.floor_level);
    if (patch.unit_type) next.unit_type = patch.unit_type;
    if (patch.base_price_monthly) {
      next.base_price_monthly = Number(patch.base_price_monthly);
    }
    if (patch.is_active === "active") next.is_active = true;
    if (patch.is_active === "inactive") next.is_active = false;
    return next;
  }

  async function runBulkUpdate(mode: "preview" | "apply") {
    const payloadPatch = buildPatch();
    if (Object.keys(payloadPatch).length === 0) {
      toast.error(isEn ? "Choose at least one change." : "Elige al menos un cambio.");
      return;
    }

    setBusy(mode);
    const result = await bulkUpdateUnitsFromUnitsModuleAction({
      organizationId: orgId,
      dryRun: mode === "preview",
      filters: {
        property_id: propertyId ?? undefined,
        unit_ids: selectedUnits.map((unit) => unit.id),
      },
      patch: payloadPatch,
    });
    setBusy(null);

    if (!result.ok) {
      toast.error(isEn ? "Bulk update failed" : "Falló la actualización", {
        description: result.error,
      });
      return;
    }

    if (result.dryRun) {
      setPreview(result);
      return;
    }

    setPreview(null);
    setPatch(EMPTY_PATCH);
    onOpenChange(false);
    onApplied?.();
    toast.success(
      isEn
        ? `${result.updatedCount} units updated`
        : `${result.updatedCount} unidades actualizadas`
    );
  }

  const selectedCount = selectedUnits.length;

  return (
    <Drawer
      closeLabel={isEn ? "Close bulk update" : "Cerrar actualización masiva"}
      description={
        isEn
          ? "Preview the impact first, then apply the same patch to every selected unit."
          : "Primero previsualiza el impacto y luego aplica el mismo cambio a todas las unidades seleccionadas."
      }
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      title={isEn ? "Bulk update units" : "Actualizar unidades"}
      className="w-[min(94vw,34rem)]"
    >
      <div className="space-y-6 px-4 py-5 sm:px-6">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
          <p className="font-medium text-sm">
            {isEn ? "Selected units" : "Unidades seleccionadas"}
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            {selectedCount} {isEn ? "records in this patch" : "registros en este cambio"}
          </p>
          <p className="mt-3 text-muted-foreground text-xs">
            {selectedUnits
              .slice(0, 6)
              .map((unit) => unit.code || unit.id)
              .join(", ")}
            {selectedCount > 6 ? "..." : ""}
          </p>
        </div>

        <FieldGroup>
          <Field htmlFor="bulk-condition" label={isEn ? "Condition" : "Condición"}>
            <Select
              id="bulk-condition"
              onChange={(event) => updatePatch("condition_status", event.target.value)}
              value={patch.condition_status}
            >
              <option value="">{isEn ? "Leave unchanged" : "Sin cambios"}</option>
              <option value="clean">{isEn ? "Clean" : "Limpia"}</option>
              <option value="dirty">{isEn ? "Dirty" : "Sucia"}</option>
              <option value="inspecting">{isEn ? "Inspecting" : "En inspección"}</option>
              <option value="out_of_order">
                {isEn ? "Out of order" : "Fuera de servicio"}
              </option>
            </Select>
          </Field>
          <Field htmlFor="bulk-floor" label={isEn ? "Floor" : "Piso"}>
            <Input
              id="bulk-floor"
              onChange={(event) => updatePatch("floor_level", event.target.value)}
              type="number"
              value={patch.floor_level}
            />
          </Field>
          <Field htmlFor="bulk-unit-type" label={isEn ? "Unit type" : "Tipo de unidad"}>
            <Select
              id="bulk-unit-type"
              onChange={(event) => updatePatch("unit_type", event.target.value)}
              value={patch.unit_type}
            >
              <option value="">{isEn ? "Leave unchanged" : "Sin cambios"}</option>
              <option value="entire_place">
                {isEn ? "Entire place" : "Unidad completa"}
              </option>
              <option value="private_room">
                {isEn ? "Private room" : "Habitación privada"}
              </option>
              <option value="shared_room">
                {isEn ? "Shared room" : "Habitación compartida"}
              </option>
              <option value="bed">{isEn ? "Bed" : "Cama"}</option>
            </Select>
          </Field>
          <Field htmlFor="bulk-rent" label={isEn ? "Base monthly rent" : "Renta mensual base"}>
            <Input
              id="bulk-rent"
              min="0"
              onChange={(event) => updatePatch("base_price_monthly", event.target.value)}
              step="0.01"
              type="number"
              value={patch.base_price_monthly}
            />
          </Field>
          <Field htmlFor="bulk-active" label={isEn ? "Active state" : "Estado activo"}>
            <Select
              id="bulk-active"
              onChange={(event) => updatePatch("is_active", event.target.value)}
              value={patch.is_active}
            >
              <option value="">{isEn ? "Leave unchanged" : "Sin cambios"}</option>
              <option value="active">{isEn ? "Active" : "Activa"}</option>
              <option value="inactive">{isEn ? "Inactive" : "Inactiva"}</option>
            </Select>
          </Field>
        </FieldGroup>

        {preview ? (
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="font-medium text-sm">
              {isEn ? "Dry-run preview" : "Vista previa"}
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              {isEn
                ? `${preview.matchedCount} units match. ${preview.previewCount} unit ids are shown below before apply.`
                : `${preview.matchedCount} unidades coinciden. Se muestran ${preview.previewCount} ids antes de aplicar.`}
            </p>
            <p className="mt-3 break-all text-muted-foreground text-xs">
              {preview.previewUnitIds.join(", ")}
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <Button
            disabled={busy !== null}
            onClick={() => runBulkUpdate("preview")}
            type="button"
            variant="outline"
          >
            {busy === "preview"
              ? isEn
                ? "Previewing..."
                : "Previsualizando..."
              : isEn
                ? "Preview changes"
                : "Previsualizar cambios"}
          </Button>
          <Button
            disabled={busy !== null}
            onClick={() => runBulkUpdate("apply")}
            type="button"
          >
            {busy === "apply"
              ? isEn
                ? "Applying..."
                : "Aplicando..."
              : isEn
                ? "Apply update"
                : "Aplicar cambio"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
