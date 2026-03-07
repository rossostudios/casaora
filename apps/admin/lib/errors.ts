const ADMIN_AUTH_CONFIGURATION_PREFIX = "Admin auth configuration error:";

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function isOrgMembershipError(message: string): boolean {
  return message.includes("Forbidden: not a member of this organization");
}

export function createAdminAuthConfigurationError(): Error {
  return new Error(
    `${ADMIN_AUTH_CONFIGURATION_PREFIX} Clerk recognized the admin session, but the server could not mint a backend access token. Verify CLERK_SECRET_KEY in the admin runtime and redeploy the latest admin image.`
  );
}

export function isAdminAuthConfigurationError(message: string): boolean {
  return message.startsWith(ADMIN_AUTH_CONFIGURATION_PREFIX);
}
