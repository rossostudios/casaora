import { type DataTableRow } from "@/components/ui/data-table";

export const PY_RESIDENTIAL_IVA_RATE = 0.05;

export type GuestResult = {
  id: string;
  full_name: string;
  email?: string | null;
  phone_e164?: string | null;
};

export type LeaseRow = DataTableRow & {
  id: string;
  lease_status: string;
  lease_status_label: string;
  renewal_status: string;
  tenant_full_name: string;
  tenant_email: string | null;
  tenant_phone_e164: string | null;
  property_id: string | null;
  unit_id: string | null;
  starts_on: string;
  ends_on: string | null;
  currency: string;
  monthly_rent: number;
  service_fee_flat: number;
  security_deposit: number;
  guarantee_option_fee: number;
  tax_iva: number;
  platform_fee: number;
  notes: string | null;
};

export type PropertyOption = {
  id: string;
  label: string;
};

export type UnitOption = {
  id: string;
  label: string;
};

export function asString(value: unknown): string {
  return typeof value === "string" ? value : value ? String(value) : "";
}

export function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function canActivate(status: string): boolean {
  return status.trim().toLowerCase() === "draft";
}

export function canTerminate(status: string): boolean {
  return ["active", "delinquent"].includes(status.trim().toLowerCase());
}

export function canComplete(status: string): boolean {
  return status.trim().toLowerCase() === "terminated";
}

export function canRenew(status: string): boolean {
  return ["active", "completed"].includes(status.trim().toLowerCase());
}

export function statusLabel(value: string, isEn: boolean): string {
  const normalized = value.trim().toLowerCase();
  if (isEn) return normalized || "unknown";

  if (normalized === "draft") return "Borrador";
  if (normalized === "active") return "Activo";
  if (normalized === "delinquent") return "Moroso";
  if (normalized === "terminated") return "Terminado";
  if (normalized === "completed") return "Completado";

  return normalized || "desconocido";
}
