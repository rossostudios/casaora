"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

import { getClientClerkJwtTemplate } from "@/lib/auth/clerk-jwt-template";
import { registerClerkClientTokenGetter } from "@/lib/auth/client-access-token";

export function ClerkTokenBridgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken } = useAuth();
  const template = getClientClerkJwtTemplate();

  useEffect(() => {
    registerClerkClientTokenGetter(async () =>
      (await (template ? getToken({ template }) : getToken())) ?? null
    );
    return () => registerClerkClientTokenGetter(null);
  }, [getToken, template]);

  return <>{children}</>;
}
