function normalizeTemplate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getServerClerkJwtTemplate(): string | undefined {
  return normalizeTemplate(
    process.env.CLERK_JWT_TEMPLATE ??
      process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE
  );
}

export function getClientClerkJwtTemplate(): string | undefined {
  return normalizeTemplate(process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE);
}
