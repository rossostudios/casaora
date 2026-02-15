/**
 * Client-side API helpers with global error notifications.
 *
 * Dispatches a custom "pa-api-error" event on `window` for non-auth errors,
 * which the ApiErrorToaster component listens to.
 */

const API_ERROR_EVENT = "pa-api-error";

export type ApiErrorDetail = {
  status: number;
  path: string;
  message: string;
};

/** Dispatch a global API error notification. */
export function dispatchApiError(detail: ApiErrorDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail }));
}

/** Subscribe to global API error events. Returns an unsubscribe function. */
export function onApiError(
  handler: (detail: ApiErrorDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    handler((e as CustomEvent<ApiErrorDetail>).detail);
  };
  window.addEventListener(API_ERROR_EVENT, listener);
  return () => window.removeEventListener(API_ERROR_EVENT, listener);
}

/**
 * Thin wrapper around `fetch` for client-side API calls.
 * Dispatches a global error event on non-2xx (except 401, which is handled
 * by auth redirects).
 */
export async function clientFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      const detail =
        body?.detail ?? body?.error ?? body?.message ?? undefined;
      if (typeof detail === "string") message = detail;
    } catch {
      // non-JSON response
    }

    // Skip toast for auth errors (redirects handle those)
    if (response.status !== 401) {
      dispatchApiError({
        status: response.status,
        path: new URL(url, window.location.origin).pathname,
        message,
      });
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}
