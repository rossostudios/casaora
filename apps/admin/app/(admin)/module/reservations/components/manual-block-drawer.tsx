"use client";

import { useEffect, useState } from "react";
import { createCalendarBlockAction } from "@/app/(admin)/module/reservations/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type ManualBlockDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  isEn: boolean;
  preset?: {
    unitId: string;
    label: string;
    startsOn?: string;
    endsOn?: string;
  } | null;
  next?: string;
};

export function ManualBlockDrawer({
  open,
  onOpenChange,
  orgId,
  isEn,
  preset,
  next,
}: ManualBlockDrawerProps) {
  const [startsOn, setStartsOn] = useState(preset?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(preset?.endsOn ?? "");

  useEffect(() => {
    setStartsOn(preset?.startsOn ?? "");
    setEndsOn(preset?.endsOn ?? "");
  }, [preset?.endsOn, preset?.startsOn]);

  return (
    <Drawer
      className="w-[min(94vw,32rem)]"
      closeLabel={isEn ? "Close manual block form" : "Cerrar formulario"}
      description={
        isEn
          ? "Block a unit manually without leaving the reservations workflow."
          : "Bloquea una unidad manualmente sin salir del flujo de reservas."
      }
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      title={isEn ? "Create manual block" : "Crear bloqueo manual"}
    >
      <form action={createCalendarBlockAction} className="space-y-4 px-4 py-5 sm:px-6">
        <input name="organization_id" type="hidden" value={orgId} />
        <input name="unit_id" type="hidden" value={preset?.unitId ?? ""} />
        <input name="next" type="hidden" value={next ?? "/module/reservations"} />

        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">{preset?.label ?? (isEn ? "Selected unit" : "Unidad seleccionada")}</p>
          <p className="text-muted-foreground">
            {isEn
              ? "Manual blocks sit alongside reservations and availability."
              : "Los bloqueos manuales conviven con reservas y disponibilidad."}
          </p>
        </div>

        <Field htmlFor="reservation-block-start" label={isEn ? "Starts on" : "Comienza"} required>
          <Input
            id="reservation-block-start"
            name="starts_on"
            onChange={(event) => setStartsOn(event.target.value)}
            required
            type="date"
            value={startsOn}
          />
        </Field>

        <Field htmlFor="reservation-block-end" label={isEn ? "Ends on" : "Termina"} required>
          <Input
            id="reservation-block-end"
            min={startsOn || undefined}
            name="ends_on"
            onChange={(event) => setEndsOn(event.target.value)}
            required
            type="date"
            value={endsOn}
          />
        </Field>

        <Field htmlFor="reservation-block-reason" label={isEn ? "Reason" : "Motivo"}>
          <Input
            id="reservation-block-reason"
            name="reason"
            placeholder={isEn ? "Maintenance, owner stay, inspection..." : "Mantenimiento, uso de dueño, inspección..."}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            {isEn ? "Cancel" : "Cancelar"}
          </Button>
          <Button disabled={!preset?.unitId} type="submit">
            {isEn ? "Create block" : "Crear bloqueo"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
