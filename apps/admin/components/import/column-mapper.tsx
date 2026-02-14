"use client";

type ColumnMapping = {
  csvHeader: string;
  targetField: string;
};

type TargetField = {
  key: string;
  label: string;
  required: boolean;
};

type ColumnMapperProps = {
  csvHeaders: string[];
  targetFields: TargetField[];
  mappings: ColumnMapping[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  isEn: boolean;
};

function autoMatch(header: string, fields: TargetField[]): string {
  const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const field of fields) {
    const fieldNormalized = field.key.replace(/_/g, "").toLowerCase();
    const labelNormalized = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === fieldNormalized || normalized === labelNormalized) {
      return field.key;
    }
  }
  // Partial matches
  const partials: Record<string, string[]> = {
    name: ["nombre", "name", "propiedad", "property"],
    code: ["codigo", "code", "cod"],
    address_line1: ["direccion", "address", "dir"],
    city: ["ciudad", "city"],
    max_guests: ["huespedes", "guests", "maxguests", "capacidad"],
    bedrooms: ["dormitorios", "bedrooms", "habitaciones"],
    bathrooms: ["banos", "bathrooms"],
    property_name: ["propiedad", "property", "propertyname", "nombrepropiedad"],
  };
  for (const [key, aliases] of Object.entries(partials)) {
    if (fields.some((f) => f.key === key) && aliases.some((a) => normalized.includes(a))) {
      return key;
    }
  }
  return "";
}

export function autoDetectMappings(
  csvHeaders: string[],
  targetFields: TargetField[]
): ColumnMapping[] {
  const used = new Set<string>();
  return csvHeaders.map((header) => {
    const match = autoMatch(header, targetFields);
    if (match && !used.has(match)) {
      used.add(match);
      return { csvHeader: header, targetField: match };
    }
    return { csvHeader: header, targetField: "" };
  });
}

export function ColumnMapper({
  csvHeaders,
  targetFields,
  mappings,
  onMappingChange,
  isEn,
}: ColumnMapperProps) {
  const updateMapping = (csvHeader: string, targetField: string) => {
    onMappingChange(
      mappings.map((m) =>
        m.csvHeader === csvHeader ? { ...m, targetField } : m
      )
    );
  };

  const usedTargets = new Set(mappings.map((m) => m.targetField).filter(Boolean));

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {isEn ? "Map CSV columns to fields" : "Mapear columnas CSV a campos"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {csvHeaders.map((header) => {
          const mapping = mappings.find((m) => m.csvHeader === header);
          const currentTarget = mapping?.targetField ?? "";
          return (
            <div
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
              key={header}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {header}
              </span>
              <select
                className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs"
                onChange={(e) => updateMapping(header, e.target.value)}
                value={currentTarget}
              >
                <option value="">
                  {isEn ? "— Skip —" : "— Omitir —"}
                </option>
                {targetFields.map((field) => (
                  <option
                    disabled={usedTargets.has(field.key) && field.key !== currentTarget}
                    key={field.key}
                    value={field.key}
                  >
                    {field.label}
                    {field.required ? " *" : ""}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const PROPERTY_FIELDS: TargetField[] = [
  { key: "name", label: "Name / Nombre", required: true },
  { key: "code", label: "Code / Código", required: false },
  { key: "address_line1", label: "Address / Dirección", required: false },
  { key: "city", label: "City / Ciudad", required: false },
];

export const UNIT_FIELDS: TargetField[] = [
  { key: "code", label: "Code / Código", required: true },
  { key: "name", label: "Name / Nombre", required: true },
  { key: "property_name", label: "Property / Propiedad", required: true },
  { key: "max_guests", label: "Max Guests / Huéspedes", required: false },
  { key: "bedrooms", label: "Bedrooms / Dormitorios", required: false },
  { key: "bathrooms", label: "Bathrooms / Baños", required: false },
];
