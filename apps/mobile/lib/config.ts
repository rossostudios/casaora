const DEFAULT_API_BASE_URL = "http://localhost:8000/v1";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
export const DEFAULT_ORG_ID = process.env.EXPO_PUBLIC_DEFAULT_ORG_ID ?? "";

export function getApiBaseUrl() {
  return API_BASE_URL.replace(/\/$/, "");
}

export function getDefaultOrgId(): string | null {
  const value = DEFAULT_ORG_ID.trim();
  return value.length > 0 ? value : null;
}
