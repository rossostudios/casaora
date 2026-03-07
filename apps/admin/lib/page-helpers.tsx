/**
 * Shared server-component helpers for module page.tsx files.
 *
 * These cards (no-org, API-error) were duplicated in every page.tsx.
 * Only import from server components — this file depends on @/lib/api.
 */
import { getApiBaseUrl } from "@/lib/api";
import { isAdminAuthConfigurationError } from "@/lib/errors";

/* ------------------------------------------------------------------ */
/* No-Org card                                                        */
/* ------------------------------------------------------------------ */

export function NoOrgCard({
  isEn,
  resource,
}: {
  isEn: boolean;
  resource: [en: string, es: string];
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      <h3 className="font-semibold text-lg tracking-tight">
        {isEn
          ? "Missing organization context"
          : "Falta contexto de organización"}
      </h3>
      <p className="mt-1 text-muted-foreground text-sm">
        {isEn
          ? `Select an organization to load ${resource[0]}.`
          : `Selecciona una organización para cargar ${resource[1]}.`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* API-error card                                                     */
/* ------------------------------------------------------------------ */

export function ApiErrorCard({
  isEn,
  message,
}: {
  isEn: boolean;
  message: string;
}) {
  const isAdminAuthError = isAdminAuthConfigurationError(message);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      <h3 className="font-semibold text-lg tracking-tight">
        {isAdminAuthError
          ? isEn
            ? "Admin auth configuration error"
            : "Error de configuración de autenticación"
          : isEn
            ? "API connection failed"
            : "Fallo de conexión a la API"}
      </h3>
      <p className="mt-1 text-muted-foreground text-sm">{message}</p>
      {isAdminAuthError ? (
        <p className="mt-2 text-muted-foreground text-xs">
          {isEn
            ? "Check the admin runtime auth configuration and redeploy the latest admin image."
            : "Verifica la configuración de autenticación del panel y vuelve a desplegar la última imagen."}
        </p>
      ) : (
        <p className="mt-2 text-muted-foreground text-xs">
          Backend:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {getApiBaseUrl()}
          </code>
        </p>
      )}
    </div>
  );
}
