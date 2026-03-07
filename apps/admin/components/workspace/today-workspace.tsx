import {
  Building06Icon,
  FileSearchIcon,
  NoteEditIcon,
  SparklesIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildAgentContextHref } from "@/lib/ai-context";
import type { Locale } from "@/lib/i18n";
import type { TodayWorkspaceData } from "@/lib/workspace-types";
import { ActionCenterList } from "./action-center-list";

/* ------------------------------------------------------------------ */
/*  Quick-action card icon lookup                                      */
/* ------------------------------------------------------------------ */

const ACTION_ICONS: Record<string, IconSvgElement> = {
  properties: Building06Icon,
  applications: NoteEditIcon,
  messages: Task01Icon,
  knowledge: FileSearchIcon,
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function QuickActionCard({
  action,
}: {
  action: TodayWorkspaceData["quickActions"][number];
}) {
  const icon = ACTION_ICONS[action.id] ?? SparklesIcon;
  return (
    <Link
      className="group rounded-2xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-foreground/10 hover:bg-card"
      href={action.href}
    >
      <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground/80">
        <Icon className="h-5 w-5" icon={icon} />
      </span>
      <p className="font-semibold text-[15px] tracking-tight">{action.title}</p>
      <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
        {action.description}
      </p>
    </Link>
  );
}

function KeyMetricsCard({
  metrics,
}: {
  metrics: TodayWorkspaceData["metrics"];
}) {
  return (
    <div className="rounded-2xl bg-foreground p-6 text-background">
      <p className="mb-4 font-semibold text-[11px] uppercase tracking-[0.14em] opacity-60">
        Key metrics
      </p>
      <div className="space-y-5">
        {metrics.map((m) => (
          <div key={m.id}>
            <p className="font-medium text-[11px] uppercase tracking-[0.12em] opacity-50">
              {m.label}
            </p>
            <p className="font-semibold text-2xl tracking-tight">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AISidebar({
  isEn,
  onboarding,
  aiSummaryHref,
  suggestions,
}: {
  isEn: boolean;
  onboarding: TodayWorkspaceData["onboarding"];
  aiSummaryHref: string;
  suggestions: { title: string; body: string; href: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card/80 p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <Icon className="h-4 w-4 text-foreground" icon={SparklesIcon} />
          <h3 className="font-semibold text-[15px] tracking-tight">
            {isEn ? "AI Assistant" : "Asistente IA"}
          </h3>
        </div>

        {/* Onboarding progress */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {isEn ? "Onboarding progress" : "Progreso de onboarding"}
            </span>
            <span className="font-semibold text-sm">{onboarding.percent}%</span>
          </div>
          <Progress className="h-1.5" indicatorClassName="bg-foreground" value={onboarding.percent} />
        </div>

        {/* Suggestions */}
        <p className="mb-3 font-semibold text-[11px] text-primary/60 uppercase tracking-[0.14em]">
          {isEn ? "Suggested for you" : "Sugerido para ti"}
        </p>
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div
              className="rounded-xl border border-border/50 bg-background/60 p-3.5"
              key={s.title}
            >
              <p className="font-semibold text-sm">{s.title}</p>
              <p className="mt-1 text-muted-foreground text-[13px] leading-relaxed">
                {s.body}
              </p>
              <Link
                className="mt-2 inline-block font-semibold text-[13px] text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground/60"
                href={s.href}
              >
                {isEn ? "Learn more" : "Más info"}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Help link */}
      <Link
        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-5 transition-colors hover:bg-card"
        href={aiSummaryHref}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground">
          <Icon className="h-5 w-5" icon={SparklesIcon} />
        </span>
        <div>
          <p className="font-semibold text-sm">
            {isEn ? "Need assistance?" : "¿Necesitas ayuda?"}
          </p>
          <p className="text-muted-foreground text-[13px]">
            {isEn ? "Ask our AI assistant anything" : "Pregunta lo que necesites a la IA"}
          </p>
        </div>
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function TodayWorkspace({
  data,
  locale,
}: {
  data: TodayWorkspaceData;
  locale: Locale;
}) {
  const isEn = locale === "en-US";

  const aiSummaryHref = buildAgentContextHref({
    prompt: isEn
      ? "Summarize the most important blockers from my workspace today."
      : "Resume los bloqueos más importantes de mi espacio hoy.",
    context: {
      source: "operations",
      entityIds: data.actionCenterItems.map((item) => item.id),
      filters: { workspace: "today" },
      summary: data.briefingSummary,
      returnPath: "/app",
    },
  });

  const suggestions = [
    {
      title: isEn ? "Optimize lease terms" : "Optimizar contratos",
      body: isEn
        ? "Review units where lease terms are below market average."
        : "Revisa unidades con contratos por debajo del promedio de mercado.",
      href: "/module/leases",
    },
    {
      title: isEn ? "Maintenance Prediction" : "Predicción de mantenimiento",
      body: isEn
        ? "Upcoming maintenance items scheduled for proactive checks."
        : "Mantenimientos próximos programados para revisión proactiva.",
      href: "/module/operations",
    },
  ];

  return (
    <section className="space-y-8">
      {/* Hero header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="font-semibold text-4xl tracking-tight">
            {isEn ? "Operational Home" : "Centro Operativo"}
          </h1>
          <p className="max-w-2xl text-muted-foreground text-[15px]">
            {data.briefingSummary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href={aiSummaryHref}>
              {isEn ? "Ask AI" : "Preguntar a IA"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/module/action-center">
              {isEn ? "Action Center" : "Centro de acción"}
            </Link>
          </Button>
        </div>
      </header>

      {/* Top section: Quick actions + Key metrics */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div className="space-y-4">
          <h2 className="font-semibold text-xl tracking-tight">
            {isEn ? "What needs attention next" : "Lo que requiere atención"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.quickActions.map((action) => (
              <QuickActionCard action={action} key={action.id} />
            ))}
          </div>
        </div>
        <KeyMetricsCard metrics={data.metrics} />
      </div>

      {/* Bottom section: Action Center + AI sidebar */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-xl tracking-tight">
              {isEn ? "Action Center" : "Centro de acción"}
            </h2>
            <Badge variant="outline">{data.actionCenterCount}</Badge>
          </div>
          <ActionCenterList
            emptyDescription={
              isEn
                ? "No urgent items right now. You're all caught up!"
                : "No hay items urgentes. ¡Estás al día!"
            }
            emptyTitle={isEn ? "Queue is clear." : "La cola está despejada."}
            items={data.actionCenterItems}
            locale={locale}
          />

          {/* Recent activity + Workflows */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold text-base tracking-tight">
                {isEn ? "Recent activity" : "Actividad reciente"}
              </h3>
              {data.recentActivity.map((item) => (
                <Link
                  className="block rounded-xl border border-border/50 bg-card/60 p-4 transition-colors hover:bg-card"
                  href={item.href ?? "/module/notifications"}
                  key={item.id}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {item.createdAt}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-base tracking-tight">
                {isEn ? "Workflows in flight" : "Flujos en progreso"}
              </h3>
              <div className="rounded-xl border border-border/50 bg-card/60 p-5">
                <p className="text-center text-muted-foreground text-sm">
                  {isEn
                    ? "No active workflows detected."
                    : "No se detectaron flujos activos."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <AISidebar
          aiSummaryHref={aiSummaryHref}
          isEn={isEn}
          onboarding={data.onboarding}
          suggestions={suggestions}
        />
      </div>
    </section>
  );
}
