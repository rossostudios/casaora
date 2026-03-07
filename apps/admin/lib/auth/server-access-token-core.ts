export type ServerAccessTokenDiagnostics = {
  hasUserId: boolean;
  hasSessionId: boolean;
  canGetToken: boolean;
  usedSessionMintFallback: boolean;
  hasClerkSecretKey: boolean;
};

export type ServerAccessTokenResult = ServerAccessTokenDiagnostics & {
  token: string | null;
  failureReason:
    | "none"
    | "no_clerk_user"
    | "get_token_error"
    | "token_unavailable"
    | "clerk_auth_error";
};

type GetTokenOptions = {
  template?: string;
};

type ResolveServerAccessTokenArgs = {
  userId: string | null;
  sessionId: string | null;
  clerkSecretKey?: string;
  template?: string;
  getToken: (options?: GetTokenOptions) => Promise<string | null>;
  mintSessionToken: (params: {
    secret: string;
    sessionId: string;
    template?: string;
  }) => Promise<string | null>;
  log?: (event: string, details?: Record<string, unknown>) => void;
};

function baseResult(
  args: Pick<
    ResolveServerAccessTokenArgs,
    "userId" | "sessionId" | "clerkSecretKey"
  >
): ServerAccessTokenDiagnostics {
  return {
    hasUserId: Boolean(args.userId?.trim()),
    hasSessionId: Boolean(args.sessionId?.trim()),
    canGetToken: false,
    usedSessionMintFallback: false,
    hasClerkSecretKey: Boolean(args.clerkSecretKey?.trim()),
  };
}

export async function resolveServerAccessToken(
  args: ResolveServerAccessTokenArgs
): Promise<ServerAccessTokenResult> {
  const result = baseResult(args);
  const sessionId = args.sessionId?.trim() ?? "";
  const clerkSecretKey = args.clerkSecretKey?.trim() ?? "";

  if (!result.hasUserId) {
    args.log?.("no_clerk_user", {
      hasSessionId: result.hasSessionId,
    });
    return {
      ...result,
      token: null,
      failureReason: "no_clerk_user",
    };
  }

  try {
    const directToken = args.template
      ? await args.getToken({ template: args.template })
      : await args.getToken();

    if (directToken?.trim()) {
      return {
        ...result,
        token: directToken,
        canGetToken: true,
        failureReason: "none",
      };
    }

    args.log?.("get_token_null", {
      hasSessionId: result.hasSessionId,
      hasClerkSecretKey: result.hasClerkSecretKey,
      templateConfigured: Boolean(args.template),
    });
  } catch (error) {
    args.log?.("get_token_error", {
      hasSessionId: result.hasSessionId,
      hasClerkSecretKey: result.hasClerkSecretKey,
      templateConfigured: Boolean(args.template),
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (sessionId && clerkSecretKey) {
    args.log?.("session_mint_attempt", {
      templateConfigured: Boolean(args.template),
    });

    const fallbackToken = await args.mintSessionToken({
      secret: clerkSecretKey,
      sessionId,
      template: args.template,
    });

    if (fallbackToken?.trim()) {
      return {
        ...result,
        token: fallbackToken,
        canGetToken: true,
        usedSessionMintFallback: true,
        failureReason: "none",
      };
    }

    args.log?.("session_mint_failed", {
      templateConfigured: Boolean(args.template),
    });
  }

  return {
    ...result,
    token: null,
    failureReason: "token_unavailable",
  };
}

export function shouldThrowAdminAuthConfigurationError(
  result: ServerAccessTokenResult
): boolean {
  return (
    !result.canGetToken && (result.hasUserId || result.hasSessionId)
  );
}
