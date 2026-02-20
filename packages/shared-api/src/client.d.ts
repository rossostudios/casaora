export type QueryValue = string | number | boolean | null | undefined;

export type FetchJsonOptions = {
  baseUrl: string;
  query?: Record<string, QueryValue>;
  headers?: HeadersInit;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  timeoutMs?: number;
  body?: unknown;
  signal?: AbortSignal;
  includeJsonContentType?: boolean;
  fetchOptions?: Omit<RequestInit, "method" | "headers" | "body" | "signal">;
};

export function buildApiUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryValue>
): string;

export function fetchJson<T>(
  path: string,
  options: FetchJsonOptions
): Promise<T>;
