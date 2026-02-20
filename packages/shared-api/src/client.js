const DEFAULT_TIMEOUT_MS = 15000;

function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function buildApiUrl(baseUrl, path, query) {
  const normalizedBaseUrl = stripTrailingSlash(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function fetchJson(path, options) {
  const {
    baseUrl,
    query,
    headers,
    method = "GET",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    body,
    signal,
    includeJsonContentType = true,
    fetchOptions,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const mergedSignal =
    signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, controller.signal])
      : (signal ?? controller.signal);

  try {
    const url = buildApiUrl(baseUrl, path, query);
    const response = await fetch(url, {
      method,
      signal: mergedSignal,
      headers: {
        Accept: "application/json",
        ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
        ...(headers ?? {}),
      },
      ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
      ...(fetchOptions ?? {}),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(
        details
          ? `API ${method} ${path} failed (${response.status}): ${details}`
          : `API ${method} ${path} failed (${response.status})`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`API ${method} ${path} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
