/**
 * Client-safe noop for the server access token helper.
 * Resolved via the package.json "imports" field when bundling for client components.
 * The real implementation (server-access-token.ts) is used in RSC / server context.
 */
import type {
  ServerAccessTokenDiagnostics,
  ServerAccessTokenResult,
} from "@/lib/auth/server-access-token-core";

export async function getServerAccessToken(): Promise<string | null> {
  return null;
}

export async function getServerAccessTokenResult(): Promise<ServerAccessTokenResult> {
  return {
    token: null,
    hasUserId: false,
    hasSessionId: false,
    canGetToken: false,
    usedSessionMintFallback: false,
    hasClerkSecretKey: false,
    failureReason: "none",
  };
}

export async function getServerAccessTokenDiagnostics(): Promise<ServerAccessTokenDiagnostics> {
  return {
    hasUserId: false,
    hasSessionId: false,
    canGetToken: false,
    usedSessionMintFallback: false,
    hasClerkSecretKey: false,
  };
}

export function shouldThrowAdminAuthConfigurationError(
  _result?: ServerAccessTokenResult
): boolean {
  return false;
}
