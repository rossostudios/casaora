export function formatCurrency(
  value: unknown,
  currency = "PYG",
  locale = "es-PY"
): string {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(number)) {
    return "-";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PYG" ? 0 : 2,
  }).format(number);
}

export function formatCompactCurrency(
  value: number,
  currency = "PYG",
  locale = "es-PY"
): string {
  if (Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function humanizeKey(key: string): string {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
