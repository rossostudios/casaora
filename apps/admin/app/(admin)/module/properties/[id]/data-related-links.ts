import type { PropertyRelatedLink } from "./types";

export function buildRelatedLinks(params: {
  recordId: string;
  isEn: boolean;
}): PropertyRelatedLink[] {
  const { recordId, isEn } = params;
  const q = (key: string, value: string) =>
    `${key}=${encodeURIComponent(value)}`;

  return [
    {
      href: `/module/units?${q("property_id", recordId)}`,
      label: isEn ? "Units in this property" : "Unidades en esta propiedad",
    },
    {
      href: `/module/tasks?${q("property_id", recordId)}`,
      label: isEn ? "Tasks in this property" : "Tareas de esta propiedad",
    },
    {
      href: `/module/expenses?${q("property_id", recordId)}`,
      label: isEn ? "Expenses in this property" : "Gastos de esta propiedad",
    },
    {
      href: `/module/owner-statements?${q("property_id", recordId)}`,
      label: isEn
        ? "Owner statements in this property"
        : "Estados del propietario de esta propiedad",
    },
    {
      href: `/module/leases?${q("property_id", recordId)}`,
      label: isEn ? "Related leases" : "Contratos relacionados",
    },
    {
      href: `/module/applications?${q("property_id", recordId)}`,
      label: isEn ? "Related applications" : "Aplicaciones relacionadas",
    },
    {
      href: `/module/collections?${q("property_id", recordId)}`,
      label: isEn ? "Related collections" : "Cobros relacionados",
    },
  ];
}
