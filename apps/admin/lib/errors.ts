export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function isOrgMembershipError(message: string): boolean {
  return message.includes("Forbidden: not a member of this organization");
}
