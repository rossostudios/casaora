export type GuestCrmRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  document_type: string | null;
  document_number: string | null;
  country_code: string | null;
  preferred_language: string | null;
  notes: string | null;
  reservation_count: number;
  last_stay_end: string | null;
  next_stay_start: string | null;
  lifetime_value: number;
  verification_status: string | null;
  id_document_url: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  city: string | null;
  occupation: string | null;
  document_expiry: string | null;
  nationality: string | null;
};

export type Segment = "all" | "upcoming" | "returning" | "no_contact" | "notes";
export type SheetMode = "create" | "view" | "edit";

export function asDateLabel(
  locale: string,
  value: string | null
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export function initials(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const parts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  let first: string;
  if (parts[0] != null && parts[0][0] != null) {
    first = parts[0][0];
  } else {
    first = "?";
  }
  let second: string;
  if (parts.length > 1) {
    const lastPart = parts.at(-1);
    if (lastPart != null && lastPart[0] != null) {
      second = lastPart[0];
    } else {
      second = "";
    }
  } else {
    second = "";
  }
  return `${first}${second}`.toUpperCase();
}

export function hasContact(row: GuestCrmRow): boolean {
  const emailVal = row.email != null ? row.email.trim() : "";
  const phoneVal = row.phone_e164 != null ? row.phone_e164.trim() : "";
  if (emailVal) return true;
  if (phoneVal) return true;
  return false;
}
