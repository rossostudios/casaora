"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  assignApplicationAction,
  convertApplicationToLeaseAction,
  setApplicationStatusAction,
} from "@/app/(admin)/module/applications/actions";
import {
  ApplicationMessageDrawer,
  type ApplicationMessageTemplateOption,
} from "@/app/(admin)/module/applications/components/application-message-drawer";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildAgentContextHref } from "@/lib/ai-context";
import type { ApplicationOverviewResponse } from "@/lib/applications-overview";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useActiveLocale } from "@/lib/i18n/client";

type ApplicationWorkbenchProps = {
  orgId: string;
  data: ApplicationOverviewResponse;
  members: Record<string, unknown>[];
  messageTemplates: Record<string, unknown>[];
  returnTo: string;
  error?: string;
  success?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}



function nextStatuses(status: string): Array<{ value: string; label: string }> {
  switch (status) {
    case "new":
      return [
        { value: "screening", label: "Move to screening" },
        { value: "rejected", label: "Reject" },
        { value: "lost", label: "Mark lost" },
      ];
    case "screening":
      return [
        { value: "qualified", label: "Qualify" },
        { value: "visit_scheduled", label: "Schedule visit" },
        { value: "rejected", label: "Reject" },
        { value: "lost", label: "Mark lost" },
      ];
    case "qualified":
      return [
        { value: "visit_scheduled", label: "Schedule visit" },
        { value: "offer_sent", label: "Send offer" },
        { value: "rejected", label: "Reject" },
        { value: "lost", label: "Mark lost" },
      ];
    case "visit_scheduled":
      return [
        { value: "offer_sent", label: "Send offer" },
        { value: "qualified", label: "Return to qualified" },
        { value: "rejected", label: "Reject" },
        { value: "lost", label: "Mark lost" },
      ];
    case "offer_sent":
      return [
        { value: "rejected", label: "Reject" },
        { value: "lost", label: "Mark lost" },
      ];
    default:
      return [];
  }
}

export function ApplicationWorkbench({
  orgId,
  data,
  members,
  messageTemplates,
  returnTo,
  error,
  success,
}: ApplicationWorkbenchProps) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";
  const [messageOpen, setMessageOpen] = useState(false);

  const memberOptions = useMemo(
    () =>
      members
        .map((member) => {
          const userId = asString(member.user_id);
          const appUserValue = member.app_users;
          const appUser =
            Array.isArray(appUserValue) && appUserValue.length > 0
              ? (appUserValue[0] as Record<string, unknown>)
              : (appUserValue as Record<string, unknown> | null);
          const label =
            asString(appUser?.full_name) ||
            asString(appUser?.email) ||
            asString(member.email) ||
            userId;
          return { id: userId, label };
        })
        .filter((member) => member.id && member.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [members]
  );

  const templateOptions = useMemo<ApplicationMessageTemplateOption[]>(
    () =>
      messageTemplates
        .map((template) => ({
          id: asString(template.id),
          channel: asString(template.channel).toLowerCase(),
          name: asString(template.name),
          subject: asString(template.subject) || null,
          body: asString(template.body),
        }))
        .filter((template) => template.id && template.channel && template.body),
    [messageTemplates]
  );

  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? `What should I do next for ${data.application.applicantName}?`
      : `¿Qué debería hacer ahora con ${data.application.applicantName}?`,
    context: {
      source: "applications",
      entityIds: [data.application.id],
      filters: {},
      summary: isEn
        ? `${data.application.applicantName} is ${data.application.statusLabel.toLowerCase()} with qualification ${data.qualification.band} and SLA ${data.application.responseSlaStatus}.`
        : `${data.application.applicantName} está ${data.application.statusLabel.toLowerCase()} con calificación ${data.qualification.band} y SLA ${data.application.responseSlaStatus}.`,
      returnPath: `/module/applications/${data.application.id}`,
    },
  });
  const detailNext = `/module/applications/${data.application.id}?return_to=${encodeURIComponent(returnTo)}`;

  const statusActions = nextStatuses(data.application.status);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={returnTo}>
                {isEn ? "Back to applications" : "Volver a aplicaciones"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button onClick={() => setMessageOpen(true)} type="button">
              {isEn ? "Send follow-up" : "Enviar seguimiento"}
            </Button>
          </>
        }
        description={data.context.listingTitle || data.context.propertyName || undefined}
        eyebrow={isEn ? "Leasing Application" : "Aplicacion de leasing"}
        title={data.application.applicantName}
      >
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={data.application.statusLabel} value={data.application.status} />
          <StatusBadge
            label={`${data.qualification.score} · ${data.qualification.band}`}
            value={data.qualification.band}
          />
          <StatusBadge
            label={data.application.responseSlaStatus}
            value={data.application.responseSlaStatus}
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-emerald-600 text-sm">
            {success}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                {isEn ? "Qualification" : "Calificacion"}
              </p>
              <p className="font-semibold text-3xl tracking-tight">
                {data.qualification.score}
              </p>
              <p className="text-muted-foreground text-sm">{data.qualification.band}</p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                SLA
              </p>
              <p className="font-semibold text-3xl tracking-tight">
                {data.application.responseSlaStatus}
              </p>
              <p className="text-muted-foreground text-sm">
                {formatDateTime(data.application.lastTouchAt, locale)}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                {isEn ? "Income" : "Ingresos"}
              </p>
              <p className="font-semibold text-3xl tracking-tight">
                {formatCurrency(data.application.monthlyIncome, "PYG", locale)}
              </p>
              <p className="text-muted-foreground text-sm">
                {data.qualification.incomeToRentRatio
                  ? `${data.qualification.incomeToRentRatio.toFixed(2)}x`
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                {isEn ? "Created" : "Creada"}
              </p>
              <p className="font-semibold text-xl tracking-tight">
                {formatDateTime(data.application.createdAt, locale)}
              </p>
              <p className="text-muted-foreground text-sm">{data.application.source}</p>
            </CardContent>
          </Card>
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Assign ownership, move the application forward, convert it to a lease, or launch AI with this exact workbench context."
                  : "Asigna responsable, avanza la aplicación, conviértela en contrato o lanza IA con este contexto exacto."
              }
              title={isEn ? "Application actions" : "Acciones"}
            >
              <form action={assignApplicationAction} className="space-y-3">
                <input name="application_id" type="hidden" value={data.application.id} />
                <input name="status" type="hidden" value={data.application.status} />
                <input name="next" type="hidden" value={detailNext} />
                <input
                  name="note"
                  type="hidden"
                  value={isEn ? "Assignment updated" : "Asignacion actualizada"}
                />
                <Field htmlFor="application-assignee" label={isEn ? "Owner" : "Responsable"}>
                  <Select
                    defaultValue={data.application.assignedUserId ?? "__unassigned__"}
                    id="application-assignee"
                    name="assigned_user_id"
                  >
                    <option value="__unassigned__">
                      {isEn ? "Unassigned" : "Sin asignar"}
                    </option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button className="w-full justify-start" type="submit" variant="outline">
                  {isEn ? "Update owner" : "Actualizar responsable"}
                </Button>
              </form>

              {statusActions.length > 0 ? (
                <div className="space-y-2">
                  {statusActions.map((action) => (
                    <form action={setApplicationStatusAction} key={action.value}>
                      <input name="application_id" type="hidden" value={data.application.id} />
                      <input name="status" type="hidden" value={action.value} />
                      <input name="next" type="hidden" value={detailNext} />
                      <Button className="w-full justify-start" type="submit" variant="outline">
                        {isEn ? action.label : action.label}
                      </Button>
                    </form>
                  ))}
                </div>
              ) : null}

              <form action={convertApplicationToLeaseAction} className="space-y-3">
                <input name="application_id" type="hidden" value={data.application.id} />
                <input name="next" type="hidden" value={detailNext} />
                <Field htmlFor="convert-starts-on" label={isEn ? "Lease starts on" : "Inicio del contrato"}>
                  <Input
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    id="convert-starts-on"
                    name="starts_on"
                    type="date"
                  />
                </Field>
                <Field htmlFor="convert-platform-fee" label={isEn ? "Platform fee" : "Fee de plataforma"}>
                  <Input
                    defaultValue="0"
                    id="convert-platform-fee"
                    name="platform_fee"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Button
                  className="w-full justify-start"
                  disabled={!data.conversion.canConvert}
                  type="submit"
                  variant="outline"
                >
                  {data.conversion.canConvert
                    ? isEn
                      ? "Convert to lease"
                      : "Convertir a contrato"
                    : isEn
                      ? "Lease already created"
                      : "Contrato ya creado"}
                </Button>
              </form>

              <Button
                className="w-full justify-start"
                onClick={() => setMessageOpen(true)}
                type="button"
                variant="outline"
              >
                {isEn ? "Send follow-up" : "Enviar seguimiento"}
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={askAiHref}>
                  {isEn ? "Review with AI" : "Revisar con IA"}
                </Link>
              </Button>
              {data.context.listingId ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/module/listings">
                    {isEn ? "Open listing" : "Abrir listing"}
                  </Link>
                </Button>
              ) : null}
              {data.context.propertyId ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={`/module/properties/${data.context.propertyId}`}>
                    {isEn ? "Open property" : "Abrir propiedad"}
                  </Link>
                </Button>
              ) : null}
              {data.context.unitId ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={`/module/units/${data.context.unitId}`}>
                    {isEn ? "Open unit" : "Abrir unidad"}
                  </Link>
                </Button>
              ) : null}
              {data.conversion.relatedLeaseId ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/module/leases">
                    {isEn ? "Open lease" : "Abrir contrato"}
                  </Link>
                </Button>
              ) : null}
            </ActionRail>
          }
          primary={
            <div className="space-y-6" data-testid="application-workbench">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Applicant profile" : "Perfil del postulante"}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="font-medium text-sm">{data.application.applicantName}</p>
                    <p className="text-muted-foreground text-sm">{data.application.email}</p>
                    {data.application.phoneE164 ? (
                      <p className="text-muted-foreground text-sm">{data.application.phoneE164}</p>
                    ) : null}
                    {data.application.documentNumber ? (
                      <p className="text-muted-foreground text-sm">
                        {isEn ? "Document" : "Documento"}: {data.application.documentNumber}
                      </p>
                    ) : null}
                    {data.application.guaranteeChoice ? (
                      <p className="text-muted-foreground text-sm">
                        {isEn ? "Guarantee" : "Garantia"}:{" "}
                        {data.application.guaranteeChoice.replaceAll("_", " ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-sm">
                      {isEn ? "Qualification notes" : "Notas de calificacion"}
                    </p>
                    <ul className="space-y-1 text-muted-foreground text-sm">
                      {data.qualification.reasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                    {data.application.message ? (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                        {data.application.message}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Listing and inventory context" : "Contexto de listing e inventario"}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-border/60 p-4">
                    <p className="font-medium text-sm">{isEn ? "Listing" : "Listing"}</p>
                    <p className="mt-2 text-muted-foreground text-sm">
                      {data.context.listingTitle || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 p-4">
                    <p className="font-medium text-sm">{isEn ? "Property" : "Propiedad"}</p>
                    <p className="mt-2 text-muted-foreground text-sm">
                      {data.context.propertyName || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 p-4">
                    <p className="font-medium text-sm">{isEn ? "Unit" : "Unidad"}</p>
                    <p className="mt-2 text-muted-foreground text-sm">
                      {data.context.unitName || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {data.failedSubmissionHistory && data.failedSubmissionHistory.length > 0 ? (
                <Card className="border border-border/60 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>{isEn ? "Failed intake history" : "Historial de intake fallido"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.failedSubmissionHistory.map((event) => (
                      <div className="rounded-xl border border-border/60 p-3" key={event.id}>
                        <p className="font-medium text-sm">{formatDateTime(event.createdAt, locale)}</p>
                        <p className="mt-1 text-muted-foreground text-sm">{event.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Message history" : "Historial de mensajes"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.messages.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {isEn
                        ? "No linked messages yet. Use Send follow-up to keep communication inside the application workflow."
                        : "Todavia no hay mensajes vinculados. Usa Enviar seguimiento para mantener la comunicacion dentro del flujo."}
                    </p>
                  ) : (
                    data.messages.map((message) => (
                      <div className="rounded-xl border border-border/60 p-3" key={message.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={message.channel} />
                          <StatusBadge value={message.direction} />
                          <StatusBadge value={message.status} />
                        </div>
                        {message.subject ? (
                          <p className="mt-2 font-medium text-sm">{message.subject}</p>
                        ) : null}
                        <p className="mt-1 text-muted-foreground text-sm">
                          {message.bodyPreview || "—"}
                        </p>
                        <p className="mt-2 text-muted-foreground text-xs">
                          {formatDateTime(message.createdAt, locale)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Timeline" : "Timeline"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3" data-testid="application-timeline">
                  {data.timeline.map((event) => (
                    <div className="rounded-xl border border-border/60 p-3" key={event.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="mt-1 text-muted-foreground text-sm">{event.subtitle || "—"}</p>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(event.createdAt, locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          }
        />
      </PageScaffold>

      <ApplicationMessageDrawer
        applicantName={data.application.applicantName}
        applicationId={data.application.id}
        email={data.application.email}
        isEn={isEn}
        onOpenChange={setMessageOpen}
        open={messageOpen}
        orgId={orgId}
        phoneE164={data.application.phoneE164}
        returnTo={detailNext}
        templates={templateOptions}
      />
    </div>
  );
}
