"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptRenewalAction,
  sendRenewalOfferAction,
  setLeaseStatusAction,
} from "@/app/(admin)/module/leases/actions";
import { LeaseFormSheet } from "@/app/(admin)/module/leases/lease-form-sheet";
import { DocumentUpload } from "@/app/(admin)/module/documents/document-upload";
import { generateLeaseContractPdf } from "@/components/reports/lease-contract-pdf";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildAgentContextHref } from "@/lib/ai-context";
import { authedFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { LeaseDetailOverview } from "@/lib/leases-overview";

type LeaseWorkbenchProps = {
  orgId: string;
  locale: string;
  detail: LeaseDetailOverview;
  returnTo: string;
  properties: Record<string, unknown>[];
  units: Record<string, unknown>[];
  error?: string;
  success?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    parsed,
  );
}

function statusActions(
  status: string,
): Array<{ value: string; label: string }> {
  switch (status) {
    case "draft":
      return [{ value: "active", label: "Activate" }];
    case "active":
    case "delinquent":
      return [{ value: "terminated", label: "Terminate" }];
    case "terminated":
      return [{ value: "completed", label: "Complete" }];
    default:
      return [];
  }
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border border-border/60 bg-card/80 shadow-sm">
      <CardContent className="space-y-1 p-5">
        <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
          {label}
        </p>
        <p className="font-semibold text-2xl tracking-tight">{value}</p>
        <p className="text-muted-foreground text-sm">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function LeaseWorkbench({
  orgId,
  locale,
  detail,
  returnTo,
  properties,
  units,
  error,
  success,
}: LeaseWorkbenchProps) {
  const isEn = locale === "en-US";
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [documents, setDocuments] = useState(detail.documents.items);

  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? `What should I do next for ${detail.lease.tenantName}'s lease?`
      : `¿Qué debería hacer ahora con el contrato de ${detail.lease.tenantName}?`,
    context: {
      source: "leases",
      entityIds: [detail.lease.id],
      filters: {},
      summary: isEn
        ? `${detail.lease.tenantName} is ${detail.lease.leaseStatusLabel.toLowerCase()} with collections state ${detail.collections.state} and renewal ${detail.renewal.status ?? "none"}.`
        : `${detail.lease.tenantName} está ${detail.lease.leaseStatusLabel.toLowerCase()} con cobros ${detail.collections.state} y renovación ${detail.renewal.status ?? "ninguna"}.`,
      returnPath: `/module/leases/${detail.lease.id}`,
    },
  });

  const propertyOptions = useMemo(
    () =>
      properties
        .map((property) => ({
          id: asString(property.id),
          label: asString(property.name),
        }))
        .filter((property) => property.id && property.label),
    [properties],
  );

  const unitOptions = useMemo(
    () =>
      units
        .map((unit) => ({
          id: asString(unit.id),
          label: asString(unit.name) || asString(unit.code),
          propertyId: asString(unit.property_id),
        }))
        .filter((unit) => unit.id && unit.label),
    [units],
  );

  const nextPath = `/module/leases/${detail.lease.id}?return_to=${encodeURIComponent(returnTo)}`;
  const actions = statusActions(detail.lease.leaseStatus);

  async function handleDownloadContract() {
    await generateLeaseContractPdf(
      {
        tenantName: detail.lease.tenantName,
        tenantEmail: detail.lease.tenantEmail ?? "",
        tenantPhone: detail.lease.tenantPhoneE164 ?? "",
        propertyName: detail.occupancy.propertyName ?? "",
        unitName: detail.occupancy.unitName ?? "",
        startsOn: detail.lease.startsOn,
        endsOn: detail.lease.endsOn ?? "",
        monthlyRent: detail.lease.monthlyRent,
        serviceFee: detail.lease.serviceFeeFlat,
        securityDeposit: detail.lease.securityDeposit,
        guaranteeFee: detail.lease.guaranteeOptionFee,
        taxIva: detail.lease.taxIva,
        totalMoveIn: detail.lease.totalMoveIn,
        monthlyTotal: detail.lease.monthlyRecurringTotal,
        currency: detail.lease.currency,
        notes: detail.lease.notes ?? "",
        orgName: "Casaora",
      },
      isEn,
    );
  }

  async function handleDocumentUploaded(file: {
    url: string;
    name: string;
    mimeType: string;
    size: number;
  }) {
    const created = await authedFetch<Record<string, unknown>>("/documents", {
      method: "POST",
      body: JSON.stringify({
        organization_id: orgId,
        entity_type: "lease",
        entity_id: detail.lease.id,
        file_name: file.name,
        file_url: file.url,
        mime_type: file.mimeType,
        file_size_bytes: file.size,
        category: "other",
      }),
    });
    setDocuments((current) => [created, ...current]);
    router.refresh();
  }

  return (
    <div
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
      data-testid="lease-workbench"
    >
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={returnTo}>
                {isEn ? "Back to leases" : "Volver a contratos"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
            <Button onClick={() => setEditOpen(true)} type="button">
              {isEn ? "Edit lease" : "Editar contrato"}
            </Button>
          </>
        }
        description={
          [detail.occupancy.propertyName, detail.occupancy.unitName]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        eyebrow={isEn ? "Lease workbench" : "Workbench del contrato"}
        title={detail.lease.tenantName}
      >
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={detail.lease.leaseStatusLabel}
            value={detail.lease.leaseStatus}
          />
          <StatusBadge
            label={detail.collections.state}
            value={detail.collections.state}
          />
          {detail.renewal.status ? (
            <StatusBadge
              label={detail.renewal.status}
              value={detail.renewal.status}
            />
          ) : null}
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
          <SummaryCard
            detail={
              detail.lease.endsOn
                ? formatDate(detail.lease.endsOn, locale)
                : "—"
            }
            label={isEn ? "Term" : "Vigencia"}
            value={formatDate(detail.lease.startsOn, locale)}
          />
          <SummaryCard
            detail={isEn ? "monthly recurring total" : "recurrente mensual"}
            label={isEn ? "Monthly recurring" : "Mensual"}
            value={formatCurrency(
              detail.lease.monthlyRecurringTotal,
              detail.lease.currency,
              locale,
            )}
          />
          <SummaryCard
            detail={`${detail.collections.openCount} ${isEn ? "open records" : "registros abiertos"}`}
            label={isEn ? "Collections" : "Cobros"}
            value={formatCurrency(
              detail.collections.unpaidAmount,
              detail.lease.currency,
              locale,
            )}
          />
          <SummaryCard
            detail={isEn ? "files linked to this lease" : "archivos vinculados"}
            label={isEn ? "Documents" : "Documentos"}
            value={String(documents.length)}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Move the lease through its safe lifecycle, handle renewals, export the contract PDF, and jump into the specialist modules only when needed."
                  : "Mueve el contrato por su ciclo de vida seguro, gestiona renovaciones, exporta el PDF y entra a módulos especialistas sólo cuando haga falta."
              }
              title={isEn ? "Lease actions" : "Acciones"}
            >
              {actions.map((action) => (
                <form action={setLeaseStatusAction} key={action.value}>
                  <input
                    name="lease_id"
                    type="hidden"
                    value={detail.lease.id}
                  />
                  <input
                    name="lease_status"
                    type="hidden"
                    value={action.value}
                  />
                  <input name="next" type="hidden" value={nextPath} />
                  <Button
                    className="w-full justify-start"
                    type="submit"
                    variant="outline"
                  >
                    {isEn ? action.label : action.label}
                  </Button>
                </form>
              ))}

              {detail.renewal.canOffer ? (
                <form action={sendRenewalOfferAction} className="space-y-2">
                  <input
                    name="lease_id"
                    type="hidden"
                    value={detail.lease.id}
                  />
                  <input name="next" type="hidden" value={nextPath} />
                  <Button
                    className="w-full justify-start"
                    type="submit"
                    variant="outline"
                  >
                    {isEn
                      ? "Send renewal offer"
                      : "Enviar oferta de renovación"}
                  </Button>
                </form>
              ) : null}

              {detail.renewal.canAccept ? (
                <form action={acceptRenewalAction}>
                  <input
                    name="lease_id"
                    type="hidden"
                    value={detail.lease.id}
                  />
                  <input name="next" type="hidden" value={nextPath} />
                  <Button
                    className="w-full justify-start"
                    type="submit"
                    variant="outline"
                  >
                    {isEn ? "Accept renewal" : "Aceptar renovación"}
                  </Button>
                </form>
              ) : null}

              <Button
                className="w-full justify-start"
                onClick={handleDownloadContract}
                type="button"
                variant="outline"
              >
                {isEn ? "Download contract PDF" : "Descargar contrato PDF"}
              </Button>

              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href={detail.related.collectionsHref}>
                  {isEn ? "Open Collections" : "Abrir cobros"}
                </Link>
              </Button>

              {detail.related.propertyHref ? (
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href={detail.related.propertyHref}>
                    {isEn ? "Open property" : "Abrir propiedad"}
                  </Link>
                </Button>
              ) : null}
              {detail.related.unitHref ? (
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href={detail.related.unitHref}>
                    {isEn ? "Open unit" : "Abrir unidad"}
                  </Link>
                </Button>
              ) : null}
              {detail.related.applicationId ? (
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link
                    href={`/module/applications/${detail.related.applicationId}`}
                  >
                    {isEn ? "Open application" : "Abrir aplicación"}
                  </Link>
                </Button>
              ) : null}
            </ActionRail>
          }
          primary={
            <div className="space-y-4">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Tenant identity" : "Identidad del inquilino"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Name" : "Nombre"}
                    </p>
                    <p className="font-medium">{detail.lease.tenantName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Email</p>
                    <p className="font-medium">
                      {detail.lease.tenantEmail || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Phone" : "Teléfono"}
                    </p>
                    <p className="font-medium">
                      {detail.lease.tenantPhoneE164 || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Occupancy target" : "Destino de ocupación"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Property" : "Propiedad"}
                    </p>
                    <p className="font-medium">
                      {detail.occupancy.propertyName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Unit" : "Unidad"}
                    </p>
                    <p className="font-medium">
                      {detail.occupancy.unitName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Space" : "Espacio"}
                    </p>
                    <p className="font-medium">
                      {detail.occupancy.spaceName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Bed" : "Cama"}
                    </p>
                    <p className="font-medium">
                      {detail.occupancy.bedCode || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Financial terms" : "Términos financieros"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Monthly rent" : "Renta mensual"}
                    </p>
                    <p className="font-medium">
                      {formatCurrency(
                        detail.lease.monthlyRent,
                        detail.lease.currency,
                        locale,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Service fee" : "Cuota de servicio"}
                    </p>
                    <p className="font-medium">
                      {formatCurrency(
                        detail.lease.serviceFeeFlat,
                        detail.lease.currency,
                        locale,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">IVA</p>
                    <p className="font-medium">
                      {formatCurrency(
                        detail.lease.taxIva,
                        detail.lease.currency,
                        locale,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Security deposit" : "Depósito"}
                    </p>
                    <p className="font-medium">
                      {formatCurrency(
                        detail.lease.securityDeposit,
                        detail.lease.currency,
                        locale,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Guarantee fee" : "Cuota de garantía"}
                    </p>
                    <p className="font-medium">
                      {formatCurrency(
                        detail.lease.guaranteeOptionFee,
                        detail.lease.currency,
                        locale,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Total move-in" : "Total de ingreso"}
                    </p>
                    <p className="font-medium">
                      {formatCurrency(
                        detail.lease.totalMoveIn,
                        detail.lease.currency,
                        locale,
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="border border-border/60 bg-card/80 shadow-sm"
                data-testid="lease-collections-panel"
              >
                <CardHeader>
                  <CardTitle>
                    {isEn ? "Collections summary" : "Resumen de cobros"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        {isEn ? "State" : "Estado"}
                      </p>
                      <StatusBadge
                        label={detail.collections.state}
                        value={detail.collections.state}
                      />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">
                        {isEn ? "Open" : "Abiertos"}
                      </p>
                      <p className="font-medium">
                        {detail.collections.openCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">
                        {isEn ? "Overdue" : "Vencidos"}
                      </p>
                      <p className="font-medium">
                        {detail.collections.overdueCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">
                        {isEn ? "Unpaid amount" : "Saldo pendiente"}
                      </p>
                      <p className="font-medium">
                        {formatCurrency(
                          detail.collections.unpaidAmount,
                          detail.lease.currency,
                          locale,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {detail.collections.recent.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {isEn
                          ? "No collection records yet."
                          : "Aún no hay registros de cobro."}
                      </p>
                    ) : (
                      detail.collections.recent.map((record) => (
                        <div
                          className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-sm"
                          key={asString(record.id)}
                        >
                          <div>
                            <p className="font-medium">
                              {asString(record.status) || "—"}
                            </p>
                            <p className="text-muted-foreground">
                              {formatDate(
                                asString(record.dueDate) || null,
                                locale,
                              )}
                            </p>
                          </div>
                          <p className="font-medium">
                            {formatCurrency(
                              Number(record.amount ?? 0),
                              detail.lease.currency,
                              locale,
                            )}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card
                className="border border-border/60 bg-card/80 shadow-sm"
                data-testid="lease-documents-panel"
              >
                <CardHeader>
                  <CardTitle>{isEn ? "Documents" : "Documentos"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DocumentUpload
                    isEn={isEn}
                    onUploaded={handleDocumentUploaded}
                    orgId={orgId}
                  />
                  <div className="space-y-2">
                    {documents.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {isEn
                          ? "No lease documents uploaded yet."
                          : "Aún no hay documentos del contrato."}
                      </p>
                    ) : (
                      documents.map((document) => (
                        <a
                          className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-sm hover:bg-accent"
                          href={asString(document.file_url)}
                          key={asString(document.id)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <div>
                            <p className="font-medium">
                              {asString(document.file_name)}
                            </p>
                            <p className="text-muted-foreground">
                              {asString(document.category) || "other"}
                            </p>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {formatDate(
                              asString(document.created_at) || null,
                              locale,
                            )}
                          </span>
                        </a>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Renewal" : "Renovación"}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Status" : "Estado"}
                    </p>
                    <p className="font-medium">
                      {detail.renewal.status || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Offered rent" : "Renta ofrecida"}
                    </p>
                    <p className="font-medium">
                      {detail.renewal.offeredRent === null
                        ? "—"
                        : formatCurrency(
                            detail.renewal.offeredRent,
                            detail.lease.currency,
                            locale,
                          )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Parent lease" : "Contrato padre"}
                    </p>
                    <p className="font-medium">
                      {detail.renewal.parentLeaseId || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "Child renewal" : "Renovación hija"}
                    </p>
                    <p className="font-medium">
                      {detail.renewal.childLeaseId || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          }
        />
      </PageScaffold>

      <LeaseFormSheet
        editing={{
          id: detail.lease.id,
          applicationId: detail.related.applicationId,
          propertyId: detail.occupancy.propertyId,
          propertyName: detail.occupancy.propertyName,
          unitId: detail.occupancy.unitId,
          unitName: detail.occupancy.unitName,
          spaceId: detail.occupancy.spaceId,
          spaceName: detail.occupancy.spaceName,
          bedId: detail.occupancy.bedId,
          bedCode: detail.occupancy.bedCode,
          tenantName: detail.lease.tenantName,
          tenantEmail: detail.lease.tenantEmail,
          tenantPhoneE164: detail.lease.tenantPhoneE164,
          leaseStatus: detail.lease.leaseStatus,
          startsOn: detail.lease.startsOn,
          endsOn: detail.lease.endsOn,
          currency: detail.lease.currency,
          monthlyRent: detail.lease.monthlyRent,
          serviceFeeFlat: detail.lease.serviceFeeFlat,
          securityDeposit: detail.lease.securityDeposit,
          guaranteeOptionFee: detail.lease.guaranteeOptionFee,
          taxIva: detail.lease.taxIva,
          platformFee: detail.lease.platformFee,
          notes: detail.lease.notes,
        }}
        isEn={isEn}
        nextPath={nextPath}
        onOpenChange={setEditOpen}
        open={editOpen}
        orgId={orgId}
        propertyOptions={propertyOptions}
        unitOptions={unitOptions}
      />
    </div>
  );
}
