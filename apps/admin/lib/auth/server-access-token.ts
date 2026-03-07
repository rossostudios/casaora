import { auth } from "@clerk/nextjs/server";
import { getServerClerkJwtTemplate } from "@/lib/auth/clerk-jwt-template";
import {
  type ServerAccessTokenDiagnostics,
  type ServerAccessTokenResult,
  resolveServerAccessToken,
} from "@/lib/auth/server-access-token-core";

export { shouldThrowAdminAuthConfigurationError } from "@/lib/auth/server-access-token-core";

/**
 * Dev-only: mint a short-lived JWT from a production Clerk session so the
 * local Next.js server can talk to the production backend without running
 * a local Rust backend or changing Clerk instances.
 *
 * Set DEV_CLERK_PROD_SECRET and DEV_CLERK_PROD_SESSION_ID in .env.local
 * to enable this path. Tokens are cached for 50 seconds (Clerk JWTs
 * typically live 60s).
 */
let _devTokenCache: { jwt: string; expiresAt: number } | null = null;
const SESSION_TOKEN_CACHE_TTL_MS = 50_000;
const mintedSessionTokenCache = new Map<
  string,
  { jwt: string; expiresAt: number }
>();

function logServerAuthEvent(event: string, details?: Record<string, unknown>) {
  const payload = {
    event,
    ...(details ?? {}),
  };

  console.warn("[admin-auth]", payload);
}

function getCacheKey(sessionId: string, template: string | undefined): string {
  return `${sessionId}:${template ?? "default"}`;
}

async function mintSessionToken(params: {
  secret: string;
  sessionId: string;
  template?: string;
}): Promise<string | null> {
  const cacheKey = getCacheKey(params.sessionId, params.template);
  const now = Date.now();
  const cached = mintedSessionTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.jwt;
  }

  try {
    const res = await fetch(
      `https://api.clerk.com/v1/sessions/${params.sessionId}/tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          params.template ? { template: params.template } : {}
        ),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { jwt?: string };
    if (!data.jwt) return null;
    mintedSessionTokenCache.set(cacheKey, {
      jwt: data.jwt,
      expiresAt: now + SESSION_TOKEN_CACHE_TTL_MS,
    });
    return data.jwt;
  } catch {
    return null;
  }
}

async function devProdToken(): Promise<string | null> {
  if (process.env.NODE_ENV !== "development") return null;

  const secret = process.env.DEV_CLERK_PROD_SECRET;
  const sessionId = process.env.DEV_CLERK_PROD_SESSION_ID;
  const template = getServerClerkJwtTemplate();
  if (!secret || !sessionId) return null;

  const now = Date.now();
  if (_devTokenCache && _devTokenCache.expiresAt > now) {
    return _devTokenCache.jwt;
  }

  const jwt = await mintSessionToken({ secret, sessionId, template });
  if (jwt) {
    _devTokenCache = { jwt, expiresAt: now + SESSION_TOKEN_CACHE_TTL_MS };
    return jwt;
  }
  return null;
}

function devTokenResult(token: string): ServerAccessTokenResult {
  return {
    token,
    hasUserId: false,
    hasSessionId: false,
    canGetToken: true,
    usedSessionMintFallback: false,
    hasClerkSecretKey: Boolean(process.env.CLERK_SECRET_KEY?.trim()),
    failureReason: "none",
  };
}

export async function getServerAccessTokenResult(): Promise<ServerAccessTokenResult> {
  // Dev shortcut: use a production Clerk session to mint tokens on-the-fly.
  const devToken = await devProdToken();
  if (devToken) return devTokenResult(devToken);

  const template = getServerClerkJwtTemplate();
  const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim();

  try {
    const clerkAuth = await auth();
    return await resolveServerAccessToken({
      userId: clerkAuth.userId ?? null,
      sessionId: clerkAuth.sessionId ?? null,
      clerkSecretKey,
      template,
      getToken: (options) =>
        options?.template
          ? clerkAuth.getToken({ template: options.template })
          : clerkAuth.getToken(),
      mintSessionToken,
      log: logServerAuthEvent,
    });
  } catch (error) {
    logServerAuthEvent("clerk_auth_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      token: null,
      hasUserId: false,
      hasSessionId: false,
      canGetToken: false,
      usedSessionMintFallback: false,
      hasClerkSecretKey: Boolean(clerkSecretKey),
      failureReason: "clerk_auth_error",
    };
  }
}

export async function getServerAccessTokenDiagnostics(): Promise<ServerAccessTokenDiagnostics> {
  const result = await getServerAccessTokenResult();
  return {
    hasUserId: result.hasUserId,
    hasSessionId: result.hasSessionId,
    canGetToken: result.canGetToken,
    usedSessionMintFallback: result.usedSessionMintFallback,
    hasClerkSecretKey: result.hasClerkSecretKey,
  };
}

/**
 * Returns an auth token for the Rust backend.
 * Clerk is the only supported browser auth provider for admin/web.
 */
export async function getServerAccessToken(): Promise<string | null> {
  const result = await getServerAccessTokenResult();
  return result.token;
}
