import { describe, expect, test } from "bun:test";
import {
  resolveServerAccessToken,
  shouldThrowAdminAuthConfigurationError,
} from "./server-access-token-core";

describe("resolveServerAccessToken", () => {
  test("returns the direct Clerk token when available", async () => {
    const result = await resolveServerAccessToken({
      userId: "user_123",
      sessionId: "sess_123",
      clerkSecretKey: "sk_test_123",
      getToken: async () => "direct-token",
      mintSessionToken: async () => "fallback-token",
    });

    expect(result.token).toBe("direct-token");
    expect(result.canGetToken).toBe(true);
    expect(result.usedSessionMintFallback).toBe(false);
    expect(shouldThrowAdminAuthConfigurationError(result)).toBe(false);
  });

  test("falls back to session minting when direct token lookup returns null", async () => {
    const result = await resolveServerAccessToken({
      userId: "user_123",
      sessionId: "sess_123",
      clerkSecretKey: "sk_test_123",
      getToken: async () => null,
      mintSessionToken: async () => "fallback-token",
    });

    expect(result.token).toBe("fallback-token");
    expect(result.canGetToken).toBe(true);
    expect(result.usedSessionMintFallback).toBe(true);
    expect(shouldThrowAdminAuthConfigurationError(result)).toBe(false);
  });

  test("flags admin auth configuration failure when token lookup and fallback both fail", async () => {
    const result = await resolveServerAccessToken({
      userId: "user_123",
      sessionId: "sess_123",
      getToken: async () => null,
      mintSessionToken: async () => null,
    });

    expect(result.token).toBeNull();
    expect(result.canGetToken).toBe(false);
    expect(result.hasClerkSecretKey).toBe(false);
    expect(shouldThrowAdminAuthConfigurationError(result)).toBe(true);
  });
});
