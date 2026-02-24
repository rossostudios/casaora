import { Suspense } from "react";

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
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

import { VoiceInteractions } from "./voice-interactions";

export default async function VoicePage() {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const orgId = await getActiveOrgId();

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
      </Card>
    );
  }

  let interactions: Record<string, unknown>[] = [];
  let config: Record<string, unknown>[] = [];

  try {
    const [interactionRows, configRows] = await Promise.all([
      fetchList("/voice-interactions", orgId, 200).catch(
        () => [] as Record<string, unknown>[]
      ),
      fetchList("/voice-agent-config", orgId, 1).catch(
        () => [] as Record<string, unknown>[]
      ),
    ]);
    interactions = interactionRows as Record<string, unknown>[];
    config = configRows as Record<string, unknown>[];
  } catch (err) {
    const message = errorMessage(err);
    if (isOrgMembershipError(message))
      return <OrgAccessChanged orgId={orgId} />;

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isEn ? "API connection failed" : "Fallo de conexión a la API"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          <code>{getApiBaseUrl()}</code>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Voice AI</Badge>
            <Badge className="text-[11px]" variant="secondary">
              {isEn ? "Telephony" : "Telefonía"}
            </Badge>
          </div>
          <CardTitle className="text-2xl">
            {isEn ? "Voice Agent" : "Agente de Voz"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Conversational voice agent with ElevenLabs. Handles inbound calls, maintenance requests, reservation lookups, and bilingual support."
              : "Agente de voz conversacional con ElevenLabs. Atiende llamadas entrantes, solicitudes de mantenimiento, consultas de reservas y soporte bilingüe."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <VoiceInteractions config={config} interactions={interactions} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
