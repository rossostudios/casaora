import { ChatThread } from "@/components/agent/chat-thread";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

type PageProps = {
  searchParams: Promise<{ new?: string; agent?: string }>;
};

export default async function AgentsPage({ searchParams }: PageProps) {
  const locale = await getActiveLocale();
  const orgId = await getActiveOrgId();
  const isEn = locale === "en-US";
  const params = await searchParams;

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isEn
              ? "Missing organization context"
              : "Falta contexto de organización"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <AlertTitle>
              {isEn ? "Select an organization" : "Selecciona una organización"}
            </AlertTitle>
            <AlertDescription>
              {isEn
                ? "Agents require an active organization to operate on scoped data."
                : "Los agentes requieren una organización activa para operar sobre datos con alcance."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const initialAgentSlug =
    typeof params.agent === "string" ? params.agent : undefined;

  return (
    <ChatThread
      defaultAgentSlug={initialAgentSlug}
      freshKey={typeof params.new === "string" ? params.new : undefined}
      locale={locale}
      mode="full"
      orgId={orgId}
    />
  );
}
