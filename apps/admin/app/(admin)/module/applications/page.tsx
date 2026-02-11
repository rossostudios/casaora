import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchList, getApiBaseUrl } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

import { ApplicationsManager } from "./applications-manager";

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function ApplicationsModulePage({
  searchParams,
}: PageProps) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";

  const orgId = await getActiveOrgId();
  const { success, error } = await searchParams;

  const successLabel = success ? safeDecode(success).replaceAll("-", " ") : "";
  const errorLabel = error ? safeDecode(error) : "";

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isEn
              ? "Missing organization context"
              : "Falta contexto de organización"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Select an organization to load applications."
              : "Selecciona una organización para cargar aplicaciones."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  let applications: Record<string, unknown>[] = [];
  let members: Record<string, unknown>[] = [];
  let messageTemplates: Record<string, unknown>[] = [];
  let submissionAlerts: Record<string, unknown>[] = [];
  try {
    const [applicationRows, memberRows, templateRows, alertRows] =
      await Promise.all([
        fetchList("/applications", orgId, 500),
        fetchList(`/organizations/${orgId}/members`, orgId, 300),
        fetchList("/message-templates", orgId, 300),
        fetchList("/integration-events", orgId, 200, {
          provider: "alerting",
          event_type: "application_submit_failed",
          status: "failed",
        }),
      ]);

    applications = applicationRows as Record<string, unknown>[];
    members = memberRows as Record<string, unknown>[];
    messageTemplates = templateRows as Record<string, unknown>[];
    submissionAlerts = alertRows as Record<string, unknown>[];
  } catch (err) {
    const message = errorMessage(err);
    if (isOrgMembershipError(message)) {
      return <OrgAccessChanged orgId={orgId} />;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isEn ? "API connection failed" : "Fallo de conexión a la API"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Could not load applications from backend."
              : "No se pudieron cargar aplicaciones desde el backend."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground text-sm">
          <p>
            {isEn ? "Backend base URL" : "URL base del backend"}:{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              {getApiBaseUrl()}
            </code>
          </p>
          <p className="break-words">{message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isEn ? "Applications pipeline" : "Pipeline de aplicaciones"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Run qualification workflow and convert qualified applicants to leases."
              : "Ejecuta calificación y convierte solicitantes calificados a contratos."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorLabel ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">{errorLabel}</p>
            </div>
          ) : null}
          {successLabel ? (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
              <p className="font-medium text-emerald-700">
                {isEn ? "Success" : "Éxito"}: {successLabel}
              </p>
            </div>
          ) : null}
          {submissionAlerts.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-800">
                {isEn
                  ? `Submission alerts detected: ${submissionAlerts.length}`
                  : `Alertas de envío detectadas: ${submissionAlerts.length}`}
              </p>
              <p className="mt-1 text-amber-900/80 text-xs">
                {isEn
                  ? "Review Integration Events for failed marketplace application submissions."
                  : "Revisa Eventos de Integración para envíos fallidos de aplicaciones del marketplace."}
              </p>
            </div>
          ) : null}

          <ApplicationsManager
            applications={applications}
            members={members}
            messageTemplates={messageTemplates}
          />
        </CardContent>
      </Card>
    </div>
  );
}
