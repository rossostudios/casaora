/**
 * Generate a URL-safe slug from text.
 * - lowercases
 * - NFD accent strip (except ñ→n)
 * - removes special chars
 * - spaces → hyphens
 * - collapses consecutive hyphens
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ñ/g, "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
