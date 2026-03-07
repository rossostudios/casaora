import { Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { SavedViewCount } from "@/lib/portfolio-overview";
import { cn } from "@/lib/utils";

type PropertiesFilterBarProps = {
  isEn: boolean;
  query: string;
  status: string;
  health: string;
  propertyType: string;
  view: string;
  savedViews: SavedViewCount[];
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onHealthChange: (value: string) => void;
  onPropertyTypeChange: (value: string) => void;
  onViewChange: (value: string) => void;
};

const VIEW_LABELS: Record<string, { "en-US": string; "es-PY": string }> = {
  all: { "en-US": "All", "es-PY": "Todas" },
  needs_attention: {
    "en-US": "Needs Attention",
    "es-PY": "Con atención",
  },
  vacancy_risk: { "en-US": "Vacancy Risk", "es-PY": "Riesgo vacante" },
  healthy: { "en-US": "Healthy", "es-PY": "Saludables" },
};

export function PropertiesFilterBar({
  isEn,
  query,
  status,
  health,
  propertyType,
  view,
  savedViews,
  onQueryChange,
  onStatusChange,
  onHealthChange,
  onPropertyTypeChange,
  onViewChange,
}: PropertiesFilterBarProps) {
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

      <FieldGroup className="xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <Field htmlFor="properties-search" label={isEn ? "Search" : "Buscar"}>
          <div className="relative">
            <Icon
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              icon={Search01Icon}
              size={15}
            />
            <Input
              id="properties-search"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={
                isEn
                  ? "Property name, code, address, city"
                  : "Nombre, código, dirección, ciudad"
              }
              value={query}
              className="pl-9"
            />
          </div>
        </Field>
        <Field htmlFor="properties-status" label={isEn ? "Status" : "Estado"}>
          <Select
            id="properties-status"
            onChange={(event) => onStatusChange(event.target.value)}
            value={status}
          >
            <option value="">{isEn ? "All statuses" : "Todos los estados"}</option>
            <option value="active">{isEn ? "Active" : "Activas"}</option>
            <option value="inactive">{isEn ? "Inactive" : "Inactivas"}</option>
          </Select>
        </Field>
        <Field htmlFor="properties-health" label={isEn ? "Health" : "Salud"}>
          <Select
            id="properties-health"
            onChange={(event) => onHealthChange(event.target.value)}
            value={health}
          >
            <option value="">{isEn ? "All health" : "Toda la salud"}</option>
            <option value="good">{isEn ? "Good" : "Buena"}</option>
            <option value="watch">{isEn ? "Watch" : "Seguimiento"}</option>
            <option value="critical">{isEn ? "Critical" : "Crítica"}</option>
          </Select>
        </Field>
        <Field
          htmlFor="properties-type"
          label={isEn ? "Property type" : "Tipo de propiedad"}
        >
          <Select
            id="properties-type"
            onChange={(event) => onPropertyTypeChange(event.target.value)}
            value={propertyType}
          >
            <option value="">{isEn ? "All types" : "Todos los tipos"}</option>
            <option value="apartment_building">
              {isEn ? "Apartment building" : "Edificio de apartamentos"}
            </option>
            <option value="co_living_house">
              {isEn ? "Co-living house" : "Casa co-living"}
            </option>
            <option value="hotel">{isEn ? "Hotel" : "Hotel"}</option>
            <option value="single_family">
              {isEn ? "Single family" : "Vivienda unifamiliar"}
            </option>
            <option value="multi_family">
              {isEn ? "Multi family" : "Vivienda multifamiliar"}
            </option>
            <option value="hostel">{isEn ? "Hostel" : "Hostal"}</option>
            <option value="mixed_use">{isEn ? "Mixed use" : "Uso mixto"}</option>
          </Select>
        </Field>
      </FieldGroup>
    </div>
  );
}
