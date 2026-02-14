const SAFE_WHATSAPP_HOSTS = new Set([
  "wa.me",
  "api.whatsapp.com",
  "chat.whatsapp.com",
]);
const TRAILING_DOT_RE = /\.$/;

function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(TRAILING_DOT_RE, "").toLowerCase();
}

export function getSafeWhatsAppUrl(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const hostname = normalizeHostname(parsed.hostname);
  if (!SAFE_WHATSAPP_HOSTS.has(hostname)) return null;

  if (parsed.username || parsed.password) return null;

  return parsed.toString();
}
