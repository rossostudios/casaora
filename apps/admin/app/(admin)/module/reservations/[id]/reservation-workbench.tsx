"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCalendarBlockAction,
  transitionReservationStatusAction,
  updateReservationAction,
} from "@/app/(admin)/module/reservations/actions";
import { SendGuestPortalLink } from "@/components/reservations/send-guest-portal-link";
import { ActionRail } from "@/components/ui/action-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import { PageScaffold } from "@/components/ui/page-scaffold";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildAgentContextHref } from "@/lib/ai-context";
import { formatCurrency } from "@/lib/format";
import type { ReservationDetailOverview } from "@/lib/reservations-overview";
import { ManualBlockDrawer } from "../components/manual-block-drawer";

type ReservationWorkbenchProps = {
  orgId: string;
  locale: string;
  detail: ReservationDetailOverview;
  guests: Record<string, unknown>[];
  returnTo: string;
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
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parsed);
}

function formatDateTime(value: string | null, locale: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function nextStatusActions(
  status: string,
  isEn: boolean
): Array<{ status: string; label: string }> {
  switch (status) {
    case "pending":
      return [
        { status: "confirmed", label: isEn ? "Confirm" : "Confirmar" },
        { status: "cancelled", label: isEn ? "Cancel" : "Cancelar" },
      ];
    case "confirmed":
      return [
        { status: "checked_in", label: isEn ? "Check in" : "Check in" },
        { status: "no_show", label: isEn ? "Mark no show" : "Marcar no show" },
        { status: "cancelled", label: isEn ? "Cancel" : "Cancelar" },
      ];
    case "checked_in":
      return [{ status: "checked_out", label: isEn ? "Check out" : "Check out" }];
    default:
      return [];
  }
}

function stayPhaseLabel(value: string, isEn: boolean): string {
  switch (value) {
    case "arriving_today":
      return isEn ? "Arriving today" : "Llegan hoy";
    case "departing_today":
      return isEn ? "Departing today" : "Salen hoy";
    case "in_house":
      return isEn ? "In house" : "En estadia";
    case "upcoming":
      return isEn ? "Upcoming" : "Próxima";
    case "cancelled":
      return isEn ? "Cancelled" : "Cancelada";
    default:
      return isEn ? "Completed" : "Completada";
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

export function ReservationWorkbench({
  orgId,
  locale,
  detail,
  guests,
  returnTo,
  error,
  success,
}: ReservationWorkbenchProps) {
  const isEn = locale === "en-US";
  const router = useRouter();
  const [blockOpen, setBlockOpen] = useState(false);

  const guestOptions = useMemo(
    () =>
      guests
        .map((guest) => {
          const id = asString(guest.id);
          const name = asString(guest.full_name) || asString(guest.name);
          const email = asString(guest.email);
          return {
            id,
            label: email ? `${name} · ${email}` : name,
          };
        })
        .filter((guest) => guest.id && guest.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [guests]
  );

  const askAiHref = buildAgentContextHref({
    prompt: isEn
      ? `What should I do next for reservation ${detail.reservation.guestName ?? detail.reservation.id}?`
      : `¿Qué debería hacer ahora con la reserva de ${detail.reservation.guestName ?? detail.reservation.id}?`,
    context: {
      source: "reservations",
      entityIds: [detail.reservation.id],
      filters: {},
      summary: isEn
        ? `${detail.reservation.guestName ?? "Guest"} is ${detail.reservation.statusLabel.toLowerCase()} from ${detail.reservation.checkInDate} to ${detail.reservation.checkOutDate}, with ${detail.tasks.open} open tasks and ${detail.reservation.amountDue} due.`
        : `${detail.reservation.guestName ?? "Huésped"} está ${detail.reservation.statusLabel.toLowerCase()} del ${detail.reservation.checkInDate} al ${detail.reservation.checkOutDate}, con ${detail.tasks.open} tareas abiertas y ${detail.reservation.amountDue} pendientes.`,
      returnPath: `/module/reservations/${detail.reservation.id}`,
    },
  });

  const actionNext = `/module/reservations/${detail.reservation.id}?return_to=${encodeURIComponent(returnTo)}`;
  const statusActions = nextStatusActions(detail.reservation.status, isEn);

  const activityItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      createdAt: string | null;
    }> = [];

    items.push({
      id: "created",
      title: isEn ? "Reservation created" : "Reserva creada",
      subtitle: detail.reservation.sourceLabel,
      createdAt: detail.reservation.createdAt,
    });

    if (detail.reservation.updatedAt && detail.reservation.updatedAt !== detail.reservation.createdAt) {
      items.push({
        id: "updated",
        title: isEn ? "Reservation updated" : "Reserva actualizada",
        subtitle: detail.reservation.statusLabel,
        createdAt: detail.reservation.updatedAt,
      });
    }

    detail.tasks.recent.forEach((task, index) => {
      items.push({
        id: `task-${asString(task.id) || index}`,
        title: asString(task.title) || (isEn ? "Task" : "Tarea"),
        subtitle: asString(task.status) || (isEn ? "Task activity" : "Actividad de tarea"),
        createdAt: asString(task.createdAt),
      });
    });

    detail.messaging.recent.forEach((message, index) => {
      items.push({
        id: `message-${asString(message.id) || index}`,
        title:
          asString(message.direction) === "inbound"
            ? isEn
              ? "Guest message"
              : "Mensaje del huésped"
            : isEn
              ? "Outbound message"
              : "Mensaje saliente",
        subtitle: asString(message.bodyPreview),
        createdAt: asString(message.createdAt),
      });
    });

    detail.availability.relatedBlocks.forEach((block) => {
      items.push({
        id: `block-${block.id}`,
        title: isEn ? "Manual block" : "Bloqueo manual",
        subtitle: block.reason || `${block.startsOn} → ${block.endsOn}`,
        createdAt: block.startsOn,
      });
    });

    return items.sort((left, right) =>
      (right.createdAt ?? "").localeCompare(left.createdAt ?? "")
    );
  }, [detail, isEn]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6" data-testid="reservation-workbench">
      <PageScaffold
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={returnTo}>
                {isEn ? "Back to reservations" : "Volver a reservas"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={askAiHref}>{isEn ? "Ask AI" : "Preguntar a IA"}</Link>
            </Button>
          </>
        }
        description={
          [detail.reservation.propertyName, detail.reservation.unitName]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        eyebrow={isEn ? "Reservation workbench" : "Workbench de reserva"}
        title={detail.reservation.guestName || (isEn ? "Reservation" : "Reserva")}
      >
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={detail.reservation.statusLabel}
            value={detail.reservation.status}
          />
          <StatusBadge
            label={detail.reservation.sourceLabel}
            value={detail.reservation.source}
          />
          <StatusBadge
            label={stayPhaseLabel(detail.reservation.stayPhase, isEn)}
            value={detail.reservation.stayPhase}
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
          <SummaryCard
            detail={`${detail.reservation.checkInDate} → ${detail.reservation.checkOutDate}`}
            label={isEn ? "Stay" : "Estadia"}
            value={`${detail.reservation.nights} ${isEn ? "nights" : "noches"}`}
          />
          <SummaryCard
            detail={isEn ? "total reservation value" : "valor total de la reserva"}
            label={isEn ? "Total" : "Total"}
            value={formatCurrency(detail.reservation.totalAmount, detail.reservation.currency, locale)}
          />
          <SummaryCard
            detail={isEn ? "remaining to collect" : "restante por cobrar"}
            label={isEn ? "Amount due" : "Pendiente"}
            value={formatCurrency(detail.reservation.amountDue, detail.reservation.currency, locale)}
          />
          <SummaryCard
            detail={isEn ? "tasks tied to this stay" : "tareas ligadas a esta reserva"}
            label={isEn ? "Open tasks" : "Tareas abiertas"}
            value={String(detail.tasks.open)}
          />
        </div>

        <ListDetailLayout
          aside={
            <ActionRail
              description={
                isEn
                  ? "Use the rail for lifecycle and navigation. Keep edits and context in the main workbench."
                  : "Usa el rail para ciclo de vida y navegación. Mantén edición y contexto en el workbench principal."
              }
              title={isEn ? "Actions" : "Acciones"}
            >
              {statusActions.map((action) => (
                <form action={transitionReservationStatusAction} key={action.status}>
                  <input name="next" type="hidden" value={actionNext} />
                  <input name="reservation_id" type="hidden" value={detail.reservation.id} />
                  <input name="status" type="hidden" value={action.status} />
                  <Button className="w-full justify-start" size="sm" type="submit" variant="outline">
                    {action.label}
                  </Button>
                </form>
              ))}

              {detail.related.guestPortalEligible ? (
                <SendGuestPortalLink
                  buttonClassName="justify-start"
                  buttonLabel={isEn ? "Send guest portal link" : "Enviar portal huésped"}
                  isEn={isEn}
                  onSent={() => router.refresh()}
                  reservationId={detail.reservation.id}
                  size="sm"
                  variant="outline"
                />
              ) : null}

              {detail.reservation.unitId ? (
                <Button
                  className="w-full justify-start"
                  onClick={() => setBlockOpen(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isEn ? "Create manual block" : "Crear bloqueo manual"}
                </Button>
              ) : null}

              <Button asChild className="w-full justify-start" size="sm" variant="outline">
                <Link href={askAiHref}>{isEn ? "Ask AI with this reservation" : "Preguntar a IA con esta reserva"}</Link>
              </Button>

              {detail.related.guestHref ? (
                <Button asChild className="w-full justify-start" size="sm" variant="outline">
                  <Link href={detail.related.guestHref}>
                    {isEn ? "Open guest" : "Abrir huésped"}
                  </Link>
                </Button>
              ) : null}
              {detail.related.listingHref ? (
                <Button asChild className="w-full justify-start" size="sm" variant="outline">
                  <Link href={detail.related.listingHref} target="_blank">
                    {isEn ? "Open listing" : "Abrir anuncio"}
                  </Link>
                </Button>
              ) : null}
              {detail.related.calendarHref ? (
                <Button asChild className="w-full justify-start" size="sm" variant="outline">
                  <Link href={detail.related.calendarHref}>
                    {isEn ? "Open calendar" : "Abrir calendario"}
                  </Link>
                </Button>
              ) : null}
              <Button asChild className="w-full justify-start" size="sm" variant="outline">
                <Link href={detail.tasks.href}>{isEn ? "Open tasks" : "Abrir tareas"}</Link>
              </Button>
              <Button asChild className="w-full justify-start" size="sm" variant="outline">
                <Link href={detail.expenses.href}>{isEn ? "Open expenses" : "Abrir gastos"}</Link>
              </Button>
              <Button asChild className="w-full justify-start" size="sm" variant="outline">
                <Link href={detail.messaging.href}>{isEn ? "Open messaging" : "Abrir mensajería"}</Link>
              </Button>
            </ActionRail>
          }
          primary={
            <div className="space-y-6">
              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Stay and guest context" : "Contexto de estadía y huésped"}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{isEn ? "Guest" : "Huésped"}:</span> {detail.reservation.guestName || "—"}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Email" : "Email"}:</span> {asString(detail.guest?.email) || "—"}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Phone" : "Teléfono"}:</span> {asString(detail.guest?.phone_e164) || "—"}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Source" : "Origen"}:</span> {detail.reservation.sourceLabel}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{isEn ? "Property" : "Propiedad"}:</span> {detail.reservation.propertyName || "—"}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Unit" : "Unidad"}:</span> {detail.reservation.unitName || "—"}</p>
                    <p><span className="text-muted-foreground">Check-in:</span> {formatDate(detail.reservation.checkInDate, locale)}</p>
                    <p><span className="text-muted-foreground">Check-out:</span> {formatDate(detail.reservation.checkOutDate, locale)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Financial breakdown" : "Desglose financiero"}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{isEn ? "Nightly rate" : "Tarifa noche"}:</span> {formatCurrency(detail.reservation.nightlyRate, detail.reservation.currency, locale)}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Cleaning fee" : "Limpieza"}:</span> {formatCurrency(detail.reservation.cleaningFee, detail.reservation.currency, locale)}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Tax" : "Impuesto"}:</span> {formatCurrency(detail.reservation.taxAmount, detail.reservation.currency, locale)}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{isEn ? "Extra fees" : "Extras"}:</span> {formatCurrency(detail.reservation.extraFees, detail.reservation.currency, locale)}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Discount" : "Descuento"}:</span> {formatCurrency(detail.reservation.discountAmount, detail.reservation.currency, locale)}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Paid" : "Pagado"}:</span> {formatCurrency(detail.reservation.amountPaid, detail.reservation.currency, locale)}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{isEn ? "Deposit" : "Depósito"}:</span> {formatCurrency(detail.reservation.depositAmount, detail.reservation.currency, locale)}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Deposit status" : "Estado depósito"}:</span> {detail.reservation.depositStatus || "—"}</p>
                    <p><span className="text-muted-foreground">{isEn ? "Payment method" : "Método de pago"}:</span> {detail.reservation.paymentMethod || "—"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Reservation coordination" : "Coordinación de reserva"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={updateReservationAction} className="space-y-4">
                    <input name="organization_id" type="hidden" value={orgId} />
                    <input name="reservation_id" type="hidden" value={detail.reservation.id} />
                    <input name="next" type="hidden" value={actionNext} />

                    <Field htmlFor="reservation-detail-guest" label={isEn ? "Linked guest" : "Huésped vinculado"}>
                      <Select
                        defaultValue={detail.reservation.guestId ?? ""}
                        id="reservation-detail-guest"
                        name="guest_id"
                      >
                        <option value="">{isEn ? "No linked guest" : "Sin huésped vinculado"}</option>
                        {guestOptions.map((guest) => (
                          <option key={guest.id} value={guest.id}>
                            {guest.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <FieldGroup>
                      <Field htmlFor="reservation-detail-new-guest" label={isEn ? "Create guest if needed" : "Crear huésped si hace falta"}>
                        <Input
                          id="reservation-detail-new-guest"
                          name="guest_full_name"
                          placeholder={isEn ? "Only fill if no guest is selected" : "Completa solo si no seleccionas huésped"}
                        />
                      </Field>
                      <Field htmlFor="reservation-detail-new-email" label={isEn ? "Guest email" : "Email huésped"}>
                        <Input id="reservation-detail-new-email" name="guest_email" type="email" />
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field htmlFor="reservation-detail-amount-paid" label={isEn ? "Amount paid" : "Monto pagado"}>
                        <Input
                          defaultValue={String(detail.reservation.amountPaid)}
                          id="reservation-detail-amount-paid"
                          name="amount_paid"
                          step="0.01"
                          type="number"
                        />
                      </Field>
                      <Field htmlFor="reservation-detail-payment-method" label={isEn ? "Payment method" : "Método de pago"}>
                        <Input
                          defaultValue={detail.reservation.paymentMethod ?? ""}
                          id="reservation-detail-payment-method"
                          name="payment_method"
                        />
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field htmlFor="reservation-detail-deposit-amount" label={isEn ? "Deposit amount" : "Monto depósito"}>
                        <Input
                          defaultValue={String(detail.reservation.depositAmount)}
                          id="reservation-detail-deposit-amount"
                          name="deposit_amount"
                          step="0.01"
                          type="number"
                        />
                      </Field>
                      <Field htmlFor="reservation-detail-deposit-status" label={isEn ? "Deposit status" : "Estado depósito"}>
                        <Select
                          defaultValue={detail.reservation.depositStatus ?? ""}
                          id="reservation-detail-deposit-status"
                          name="deposit_status"
                        >
                          <option value="">{isEn ? "Unchanged" : "Sin cambio"}</option>
                          <option value="none">{isEn ? "None" : "Ninguno"}</option>
                          <option value="held">{isEn ? "Held" : "Retenido"}</option>
                          <option value="collected">{isEn ? "Collected" : "Cobrado"}</option>
                          <option value="refunded">{isEn ? "Refunded" : "Devuelto"}</option>
                        </Select>
                      </Field>
                    </FieldGroup>

                    <Field htmlFor="reservation-detail-notes" label={isEn ? "Notes" : "Notas"}>
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
                        defaultValue={detail.reservation.notes ?? ""}
                        id="reservation-detail-notes"
                        name="notes"
                      />
                    </Field>

                    <div className="flex justify-end">
                      <Button type="submit">{isEn ? "Save coordination" : "Guardar coordinación"}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card
                className="border border-border/60 bg-card/80 shadow-sm"
                data-testid="reservation-availability-panel"
              >
                <CardHeader>
                  <CardTitle>{isEn ? "Availability and manual blocks" : "Disponibilidad y bloqueos"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {detail.availability.blockedPeriods.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {isEn ? "No blocked periods in this stay window." : "No hay periodos bloqueados en esta ventana."}
                      </p>
                    ) : (
                      detail.availability.blockedPeriods.map((period, index) => (
                        <div
                          className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm"
                          key={`${period.source}-${period.from}-${period.to}-${index}`}
                        >
                          <span>{period.from} → {period.to}</span>
                          <StatusBadge label={period.source} value={period.source} />
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-sm">
                      {isEn ? "Manual blocks" : "Bloqueos manuales"}
                    </p>
                    {detail.availability.relatedBlocks.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {isEn ? "No manual blocks overlap this reservation." : "No hay bloqueos manuales que crucen esta reserva."}
                      </p>
                    ) : (
                      detail.availability.relatedBlocks.map((block) => (
                        <div
                          className="flex flex-col gap-3 rounded-xl border border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                          key={block.id}
                        >
                          <div>
                            <p className="font-medium text-sm">{block.reason || (isEn ? "Manual block" : "Bloqueo manual")}</p>
                            <p className="text-muted-foreground text-xs">
                              {block.startsOn} → {block.endsOn}
                            </p>
                          </div>
                          <form action={deleteCalendarBlockAction}>
                            <input name="block_id" type="hidden" value={block.id} />
                            <input name="next" type="hidden" value={actionNext} />
                            <Button size="sm" type="submit" variant="outline">
                              {isEn ? "Delete block" : "Eliminar bloqueo"}
                            </Button>
                          </form>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{isEn ? "Activity timeline" : "Timeline de actividad"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activityItems.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {isEn ? "No activity logged yet." : "Aún no hay actividad registrada."}
                    </p>
                  ) : (
                    activityItems.map((item) => (
                      <div
                        className="rounded-xl border border-border/60 px-3 py-3"
                        key={item.id}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-sm">{item.title}</p>
                          <span className="text-muted-foreground text-xs">
                            {formatDateTime(item.createdAt, locale)}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground text-sm">{item.subtitle || "—"}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          }
        />
      </PageScaffold>

      <ManualBlockDrawer
        isEn={isEn}
        next={actionNext}
        onOpenChange={setBlockOpen}
        open={blockOpen}
        orgId={orgId}
        preset={
          detail.reservation.unitId
            ? {
                unitId: detail.reservation.unitId,
                label:
                  [detail.reservation.propertyName, detail.reservation.unitName]
                    .filter(Boolean)
                    .join(" · ") || (isEn ? "Unit" : "Unidad"),
                startsOn: detail.reservation.checkInDate,
                endsOn: detail.reservation.checkOutDate,
              }
            : null
        }
      />
    </div>
  );
}
