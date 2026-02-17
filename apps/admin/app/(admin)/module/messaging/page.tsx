import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchList, getApiBaseUrl } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import {
  type Conversation,
  type GuestInfo,
  groupByConversation,
  toGuestInfo,
  toMessageLogItem,
  toMessageTemplate,
} from "@/lib/features/messaging/types";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

import { MessagingInbox } from "./messaging-inbox";
import { TemplateEditor } from "./template-editor";

type PageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
    status?: string;
    segment?: string;
    tab?: string;
  }>;
};

export default async function MessagingModulePage({
  searchParams,
}: PageProps) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const orgId = await getActiveOrgId();
  const sp = await searchParams;
  const activeTab = sp.tab === "templates" ? "templates" : "inbox";

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
              ? "Select an organization to load the inbox."
              : "Selecciona una organización para cargar la bandeja."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {isEn ? (
            <>
              Select an organization from the top bar, or create one in{" "}
              <code className="rounded bg-muted px-1 py-0.5">Onboarding</code>.
            </>
          ) : (
            <>
              Selecciona una organización desde la barra superior o crea una en{" "}
              <code className="rounded bg-muted px-1 py-0.5">Onboarding</code>.
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  let conversations: Conversation[] = [];
  let templateRows: Record<string, unknown>[] = [];
  let fetchError: string | null = null;

  try {
    const [logRows, guestRows, tplRows] = await Promise.all([
      fetchList("/message-logs", orgId, 500),
      fetchList("/guests", orgId, 500),
      fetchList("/message-templates", orgId, 100),
    ]);

    templateRows = tplRows as Record<string, unknown>[];

    const logs = (logRows as Record<string, unknown>[]).map(toMessageLogItem);
    const guestMap = new Map<string, GuestInfo>();
    for (const raw of guestRows as Record<string, unknown>[]) {
      const guest = toGuestInfo(raw);
      if (guest.id) guestMap.set(guest.id, guest);
    }

    conversations = groupByConversation(logs, guestMap);
  } catch (err) {
    const message = errorMessage(err);

    if (isOrgMembershipError(message)) {
      return <OrgAccessChanged orgId={orgId} />;
    }

    // If message-logs endpoint doesn't exist yet (404), show empty state
    if (message.includes("(404)") || message.includes("Not Found")) {
      fetchError = null; // graceful empty
    } else {
      fetchError = message;
    }
  }

  if (fetchError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isEn ? "API connection failed" : "Fallo de conexión a la API"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Could not load message logs from the backend."
              : "No se pudieron cargar los registros de mensajes desde el backend."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {isEn ? "Backend base URL" : "URL base del backend"}:{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              {getApiBaseUrl()}
            </code>
          </p>
          <p className="break-words">{fetchError}</p>
        </CardContent>
      </Card>
    );
  }

  const templates = templateRows.map(toMessageTemplate);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {isEn ? "Communications" : "Comunicaciones"}
              </Badge>
              <Badge className="text-[11px]" variant="secondary">
                {activeTab === "templates"
                  ? isEn
                    ? "Templates"
                    : "Plantillas"
                  : isEn
                    ? "Inbox"
                    : "Bandeja"}
              </Badge>
            </div>
            <CardTitle className="text-2xl">
              {activeTab === "templates"
                ? isEn
                  ? "Message Templates"
                  : "Plantillas de Mensaje"
                : "Inbox"}
            </CardTitle>
            <CardDescription>
              {activeTab === "templates"
                ? isEn
                  ? "Create and manage reusable message templates for WhatsApp, Email, and SMS."
                  : "Crea y gestiona plantillas de mensaje reutilizables para WhatsApp, Email y SMS."
                : isEn
                  ? "View and manage guest conversations across WhatsApp, Email, and SMS."
                  : "Ver y gestionar conversaciones con huéspedes por WhatsApp, Email y SMS."}
            </CardDescription>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 border-b border-border/40 pb-0">
            <a
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "inbox"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              href="/module/messaging"
            >
              {isEn ? "Inbox" : "Bandeja"}
            </a>
            <a
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "templates"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              href="/module/messaging?tab=templates"
            >
              {isEn ? "Templates" : "Plantillas"}
              <Badge className="ml-1 px-1.5 py-0 text-[10px]" variant="secondary">
                {templates.length}
              </Badge>
            </a>
          </div>

          {sp.success ? (
            <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400">
              {sp.success.replaceAll("-", " ")}
            </div>
          ) : null}
          {sp.error ? (
            <div className="rounded-lg border border-red-200/60 bg-red-50/40 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400">
              {sp.error}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {activeTab === "templates" ? (
            <TemplateEditor orgId={orgId} templates={templates} />
          ) : (
            <MessagingInbox
              conversations={conversations}
              initialStatus={sp.status}
              initialSegment={sp.segment}
              orgId={orgId}
              templates={templates}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
