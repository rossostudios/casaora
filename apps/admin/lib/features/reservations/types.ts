export type ReservationDetail = {
  id: string;
  status: string;
  source: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  currency: string;
  nightly_rate: number;
  cleaning_fee: number;
  tax_amount: number;
  extra_fees: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  platform_fee: number;
  owner_payout_estimate: number;
  payment_method: string | null;
  payment_reference: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  external_reservation_id: string | null;
  unit_id: string;
  unit_name: string | null;
  property_id: string | null;
  property_name: string | null;
  guest_id: string | null;
  guest_name: string | null;
  integration_id: string | null;
  integration_name: string | null;
  channel_name: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestSummary = {
  id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  document_type: string | null;
  document_number: string | null;
  country_code: string | null;
  preferred_language: string | null;
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optStr(value: unknown): string | null {
  const s = str(value);
  return s || null;
}

export function toReservationDetail(
  raw: Record<string, unknown>
): ReservationDetail {
  const checkIn = str(raw.check_in_date);
  const checkOut = str(raw.check_out_date);

  let nights = num(raw.nights);
  if (nights === 0 && checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    if (!(Number.isNaN(d1.valueOf()) || Number.isNaN(d2.valueOf()))) {
      nights = Math.max(
        0,
        Math.round((d2.getTime() - d1.getTime()) / 86_400_000)
      );
    }
  }

  return {
    id: str(raw.id),
    status: str(raw.status) || "pending",
    source: str(raw.source),
    check_in_date: checkIn,
    check_out_date: checkOut,
    nights,
    adults: num(raw.adults),
    children: num(raw.children),
    infants: num(raw.infants),
    pets: num(raw.pets),
    currency: str(raw.currency) || "PYG",
    nightly_rate: num(raw.nightly_rate),
    cleaning_fee: num(raw.cleaning_fee),
    tax_amount: num(raw.tax_amount),
    extra_fees: num(raw.extra_fees),
    discount_amount: num(raw.discount_amount),
    total_amount: num(raw.total_amount),
    amount_paid: num(raw.amount_paid),
    platform_fee: num(raw.platform_fee),
    owner_payout_estimate: num(raw.owner_payout_estimate),
    payment_method: optStr(raw.payment_method),
    payment_reference: optStr(raw.payment_reference),
    cancelled_at: optStr(raw.cancelled_at),
    cancel_reason: optStr(raw.cancel_reason),
    notes: optStr(raw.notes),
    external_reservation_id: optStr(raw.external_reservation_id),
    unit_id: str(raw.unit_id),
    unit_name: optStr(raw.unit_name),
    property_id: optStr(raw.property_id),
    property_name: optStr(raw.property_name),
    guest_id: optStr(raw.guest_id),
    guest_name: optStr(raw.guest_name),
    integration_id: optStr(raw.integration_id),
    integration_name: optStr(raw.integration_name),
    channel_name: optStr(raw.channel_name),
    created_at: str(raw.created_at),
    updated_at: str(raw.updated_at),
  };
}

export function toGuestSummary(raw: Record<string, unknown>): GuestSummary {
  const firstName = str(raw.first_name);
  const lastName = str(raw.last_name);
  const fullName =
    str(raw.full_name) ||
    str(raw.name) ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Guest";

  return {
    id: str(raw.id),
    full_name: fullName,
    email: optStr(raw.email),
    phone_e164: optStr(raw.phone_e164) ?? optStr(raw.phone),
    document_type: optStr(raw.document_type),
    document_number: optStr(raw.document_number),
    country_code: optStr(raw.country_code),
    preferred_language: optStr(raw.preferred_language),
  };
}
