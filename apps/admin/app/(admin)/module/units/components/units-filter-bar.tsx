import { Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { SavedViewCount } from "@/lib/portfolio-overview";
import { cn } from "@/lib/utils";

type UnitsFilterBarProps = {
  isEn: boolean;
  query: string;
  propertyId: string;
  status: string;
  unitType: string;
  conditionStatus: string;
  view: string;
  savedViews: SavedViewCount[];
  propertyOptions: Array<{ id: string; name: string }>;
  onQueryChange: (value: string) => void;
  onPropertyChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onUnitTypeChange: (value: string) => void;
  onConditionStatusChange: (value: string) => void;
  onViewChange: (value: string) => void;
};

const VIEW_LABELS: Record<string, { "en-US": string; "es-PY": string }> = {
  all: { "en-US": "All", "es-PY": "Todas" },
  vacant: { "en-US": "Vacant", "es-PY": "Vacantes" },
  needs_turn: { "en-US": "Needs Turn", "es-PY": "Turno pendiente" },
  lease_risk: { "en-US": "Lease Risk", "es-PY": "Riesgo de contrato" },
};

export function UnitsFilterBar({
  isEn,
  query,
  propertyId,
  status,
  unitType,
  conditionStatus,
  view,
  savedViews,
  propertyOptions,
  onQueryChange,
  onPropertyChange,
  onStatusChange,
  onUnitTypeChange,
  onConditionStatusChange,
  onViewChange,
}: UnitsFilterBarProps) {
  const locale = isEn ? "en-US" : "es-PY";

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {savedViews.map((savedView) => (
          <Button
            className={cn(
              "rounded-full",
              view === savedView.id && "border-primary/20 bg-primary/10 text-primary"
            )}
            key={savedView.id}
            onClick={() => onViewChange(savedView.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {VIEW_LABELS[savedView.id]?.[locale] ?? savedView.id}
            <span className="ml-1 text-muted-foreground">
              {savedView.count}
            </span>
          </Button>
        ))}
      </div>

      <FieldGroup className="xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <Field htmlFor="units-search" label={isEn ? "Search" : "Buscar"}>
          <div className="relative">
            <Icon
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              icon={Search01Icon}
              size={15}
            />
            <Input
              id="units-search"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={
                isEn
                  ? "Unit code, name, property"
                  : "Código, nombre, propiedad"
              }
              value={query}
              className="pl-9"
            />
          </div>
        </Field>
        <Field htmlFor="units-property" label={isEn ? "Property" : "Propiedad"}>
          <Select
            id="units-property"
            onChange={(event) => onPropertyChange(event.target.value)}
            value={propertyId}
          >
            <option value="">{isEn ? "All properties" : "Todas"}</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="units-status" label={isEn ? "Status" : "Estado"}>
          <Select
            id="units-status"
            onChange={(event) => onStatusChange(event.target.value)}
            value={status}
          >
            <option value="">{isEn ? "All states" : "Todos"}</option>
            <option value="active">{isEn ? "Active" : "Activas"}</option>
            <option value="inactive">{isEn ? "Inactive" : "Inactivas"}</option>
          </Select>
        </Field>
        <Field htmlFor="units-type" label={isEn ? "Unit type" : "Tipo de unidad"}>
          <Select
            id="units-type"
            onChange={(event) => onUnitTypeChange(event.target.value)}
            value={unitType}
          >
            <option value="">{isEn ? "All types" : "Todos"}</option>
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
        <Field
          htmlFor="units-condition"
          label={isEn ? "Condition" : "Condición"}
        >
          <Select
            id="units-condition"
            onChange={(event) => onConditionStatusChange(event.target.value)}
            value={conditionStatus}
          >
            <option value="">{isEn ? "All conditions" : "Todas"}</option>
            <option value="clean">{isEn ? "Clean" : "Limpia"}</option>
            <option value="dirty">{isEn ? "Dirty" : "Sucia"}</option>
            <option value="inspecting">
              {isEn ? "Inspecting" : "En inspección"}
            </option>
            <option value="out_of_order">
              {isEn ? "Out of order" : "Fuera de servicio"}
            </option>
          </Select>
        </Field>
      </FieldGroup>
    </div>
  );
}
