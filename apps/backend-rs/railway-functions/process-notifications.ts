const baseUrlInput = (
  process.env.NOTIFICATION_TARGET_BASE_URL ??
  process.env.BACKEND_BASE_URL ??
  process.env.RAILWAY_SERVICE_PUERTA_ABIERTA_URL ??
  ""
).trim();

if (!baseUrlInput) {
  throw new Error(
    "Missing NOTIFICATION_TARGET_BASE_URL, BACKEND_BASE_URL, or RAILWAY_SERVICE_PUERTA_ABIERTA_URL."
  );
}

const baseUrl = baseUrlInput.startsWith("http")
  ? baseUrlInput
  : `https://${baseUrlInput}`;

const apiKey = (process.env.INTERNAL_API_KEY ?? "").trim();
const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/internal/process-notifications`;

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};
if (apiKey) {
  headers["x-api-key"] = apiKey;
}

const response = await fetch(endpoint, {
  method: "POST",
  headers,
});

const text = await response.text();
if (!response.ok) {
  throw new Error(`process-notifications failed (${response.status}): ${text}`);
}

console.log(
  JSON.stringify({
    job: "process-notifications",
    status: response.status,
    response: text || "{}",
  })
);
