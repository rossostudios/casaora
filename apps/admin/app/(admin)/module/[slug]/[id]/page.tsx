import {
  ArrowLeft01Icon,
  Building03Icon,
  Calendar02Icon,
  ChartIcon,
  Door01Icon,
  Invoice01Icon,
  Task01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrgInvitesCard } from "@/components/organizations/org-invites-card";
import { OrgMembersCard } from "@/components/organizations/org-members-card";
import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { PinButton } from "@/components/shell/pin-button";
import { RecordRecent } from "@/components/shell/record-recent";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { getApiBaseUrl } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { formatCurrency, humanizeKey } from "@/lib/format";
import { getActiveLocale } from "@/lib/i18n/server";
import { FOREIGN_KEY_HREF_BASE_BY_KEY } from "@/lib/links";
import {
  getModuleDescription,
  getModuleLabel,
  MODULE_BY_SLUG,
} from "@/lib/modules";
import { getActiveOrgId } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type RecordPageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

type OrganizationMemberRow = {
  organization_id: string;
  user_id: string;
  role: string;
  is_primary?: boolean | null;
  joined_at?: string | null;
  app_users?: { id: string; email: string; full_name: string } | null;
};

type OrganizationInviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at?: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isOrganizationMemberRow(
  value: unknown
): value is OrganizationMemberRow {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.organization_id === "string" &&
    typeof record.user_id === "string" &&
    typeof record.role === "string"
  );
}

function isOrganizationInviteRow(
  value: unknown
): value is OrganizationInviteRow {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.organization_id === "string" &&
    typeof record.email === "string" &&
    typeof record.token === "string"
  );
}

function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function asDateLabel(value: string, locale: "en-US" | "es-PY"): string | null {
  if (!(ISO_DATE_TIME_RE.test(value) || ISO_DATE_RE.test(value))) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;

  if (ISO_DATE_RE.test(value)) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      date
    );
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sortKeys(keys: string[]): string[] {
  const priority = [
    "id",
    "name",
    "title",
    "code",
    "status",
    "kind",
    "organization_id",
    "property_id",
    "unit_id",
    "channel_id",
    "listing_id",
    "guest_id",
    "reservation_id",
    "template_id",
    "created_at",
    "updated_at",
  ];

  const score = new Map(priority.map((key, index) => [key, index * 10]));
  const scoreFor = (key: string): number => {
    const direct = score.get(key);
    if (direct !== undefined) return direct;

    if (key.endsWith("_name")) {
      const idKey = `${key.slice(0, -5)}_id`;
      const idScore = score.get(idKey);
      if (idScore !== undefined) return idScore + 1;
    }

    return Number.POSITIVE_INFINITY;
  };

  return [...keys].sort((a, b) => {
    const aScore = scoreFor(a);
    const bScore = scoreFor(b);
    if (aScore !== bScore) return aScore - bScore;
    return a.localeCompare(b);
  });
}

function toLabel(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type StatementLineItem = {
  bucket: string;
  source_table: string;
  source_id: string;
  kind: string;
  amount_pyg: number;
  date?: string;
  from?: string;
  to?: string;
};

type StatementReconciliation = {
  gross_total?: number;
  computed_net_payout?: number;
  stored_net_payout?: number;
  stored_vs_computed_diff?: number;
};

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStatementLineItems(value: unknown): StatementLineItem[] {
  if (!Array.isArray(value)) return [];

  const rows: StatementLineItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;

    const bucket = typeof record.bucket === "string" ? record.bucket : "";
    const source_table =
      typeof record.source_table === "string" ? record.source_table : "";
    const source_id =
      typeof record.source_id === "string" ? record.source_id : "";
    const kind = typeof record.kind === "string" ? record.kind : "";
    const amount_pyg = toNumber(record.amount_pyg);

    if (!(bucket && source_table && source_id && kind) || amount_pyg === null) {
      continue;
    }

    rows.push({
      bucket,
      source_table,
      source_id,
      kind,
      amount_pyg,
      date: typeof record.date === "string" ? record.date : undefined,
      from: typeof record.from === "string" ? record.from : undefined,
      to: typeof record.to === "string" ? record.to : undefined,
    });
  }

  return rows;
}

function toStatementReconciliation(
  value: unknown
): StatementReconciliation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    gross_total: toNumber(record.gross_total) ?? undefined,
    computed_net_payout: toNumber(record.computed_net_payout) ?? undefined,
    stored_net_payout: toNumber(record.stored_net_payout) ?? undefined,
    stored_vs_computed_diff:
      toNumber(record.stored_vs_computed_diff) ?? undefined,
  };
}

function reconciliationDiffClass(diff: number): string {
  if (Math.abs(diff) < 0.01) {
    return "status-tone-success";
  }
  if (diff > 0) {
    return "status-tone-warning";
  }
  return "status-tone-danger";
}

function recordTitle(
  record: Record<string, unknown>,
  fallbackTitle: string
): string {
  const candidate = (record.name ??
    record.title ??
    record.public_name ??
    record.code ??
    record.id) as unknown;
  const text =
    typeof candidate === "string" && candidate.trim() ? candidate.trim() : "";
  if (text) return text;
  return fallbackTitle;
}

type QueryValue = string | number | boolean | undefined | null;

type PropertyRelationSnapshot = {
  units: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  ownerStatements: Record<string, unknown>[];
  leases: Record<string, unknown>[];
  reservations: Record<string, unknown>[];
  listings: Record<string, unknown>[];
  applications: Record<string, unknown>[];
  collections: Record<string, unknown>[];
};

const TASK_CLOSED_STATUSES = new Set([
  "done",
  "completed",
  "cancelled",
  "canceled",
  "resolved",
  "closed",
]);
const LEASE_ACTIVE_STATUSES = new Set(["active", "delinquent"]);
const ACTIVE_RESERVATION_STATUSES = new Set([
  "pending",
  "confirmed",
  "checked_in",
]);
const APPLICATION_CLOSED_STATUSES = new Set([
  "rejected",
  "lost",
  "contract_signed",
]);
const COLLECTION_OPEN_STATUSES = new Set([
  "scheduled",
  "pending",
  "late",
  "overdue",
  "partial",
]);
const COLLECTION_PAID_STATUSES = new Set(["paid", "completed", "settled"]);
const URGENT_TASK_PRIORITIES = new Set(["high", "critical", "urgent"]);

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedStatus(value: unknown): string {
  return asString(value).toLowerCase();
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function toDate(value: unknown): Date | null {
  const text = asString(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function getFirstValue(
  row: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return null;
}

function getAmountInPyg(row: Record<string, unknown>): number {
  const amount = toNumber(row.amount);
  if (amount === null) return 0;

  const currency = asString(row.currency).toUpperCase();
  if (currency === "PYG" || !currency) return amount;

  if (currency === "USD") {
    const fx = toNumber(row.fx_rate_to_pyg);
    if (fx !== null && fx > 0) return amount * fx;
  }

  return 0;
}

function convertAmountToPyg(
  amount: number,
  currency: string,
  fxRate?: number | null
): number {
  if (!Number.isFinite(amount)) return 0;
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!normalizedCurrency || normalizedCurrency === "PYG") return amount;
  if (normalizedCurrency === "USD") {
    if (typeof fxRate === "number" && fxRate > 0) return amount * fxRate;
    // Fallback only for dashboard estimates when FX is missing.
    return amount * 7300;
  }
  return amount;
}

function daysUntilDate(target: Date, from: Date): number {
  const diffMs = target.getTime() - from.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function toRecordArray(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> =>
    Boolean(row && typeof row === "object")
  );
}

async function fetchScopedRows(params: {
  accessToken: string | null;
  baseUrl: string;
  path: string;
  query: Record<string, QueryValue>;
}): Promise<Record<string, unknown>[] | null> {
  const url = new URL(`${params.baseUrl}${params.path}`);
  for (const [key, value] of Object.entries(params.query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(params.accessToken
          ? { Authorization: `Bearer ${params.accessToken}` }
          : {}),
      },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as unknown;
    return toRecordArray(payload);
  } catch {
    return null;
  }
}

async function loadPropertyRelationSnapshot(params: {
  accessToken: string | null;
  baseUrl: string;
  orgId: string;
  propertyId: string;
}): Promise<PropertyRelationSnapshot> {
  const { accessToken, baseUrl, orgId, propertyId } = params;

  const [
    unitsRows,
    tasksRows,
    expensesRows,
    ownerStatementRows,
    leaseRows,
    reservationRows,
    listingRows,
    applicationRows,
    collectionRows,
  ] = await Promise.all([
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/units",
      query: { org_id: orgId, property_id: propertyId, limit: 400 },
    }),
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/tasks",
      query: { org_id: orgId, property_id: propertyId, limit: 400 },
    }),
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/expenses",
      query: { org_id: orgId, property_id: propertyId, limit: 600 },
    }),
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/owner-statements",
      query: { org_id: orgId, property_id: propertyId, limit: 240 },
    }),
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/leases",
      query: { org_id: orgId, property_id: propertyId, limit: 400 },
    }),
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/reservations",
      query: { org_id: orgId, limit: 800 },
    }),
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/marketplace/listings",
      query: { org_id: orgId, limit: 400 },
    }),
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/applications",
      query: { org_id: orgId, limit: 600 },
    }),
    fetchScopedRows({
      accessToken,
      baseUrl,
      path: "/collections",
      query: { org_id: orgId, limit: 600 },
    }),
  ]);

  const units = unitsRows ?? [];
  const tasks = tasksRows ?? [];
  const expenses = expensesRows ?? [];
  const ownerStatements = ownerStatementRows ?? [];
  const leases = leaseRows ?? [];

  const reservations = (reservationRows ?? []).filter(
    (row) => asString(row.property_id) === propertyId
  );
  const listings = (listingRows ?? []).filter(
    (row) => asString(row.property_id) === propertyId
  );

  const listingIds = new Set(
    listings
      .map((row) => asString(row.id))
      .filter((rowId): rowId is string => Boolean(rowId))
  );
  const applications = (applicationRows ?? []).filter((row) =>
    listingIds.has(asString(row.marketplace_listing_id))
  );

  const leaseIds = new Set(
    leases
      .map((row) => asString(row.id))
      .filter((rowId): rowId is string => Boolean(rowId))
  );
  const collections = (collectionRows ?? []).filter((row) =>
    leaseIds.has(asString(row.lease_id))
  );

  return {
    units,
    tasks,
    expenses,
    ownerStatements,
    leases,
    reservations,
    listings,
    applications,
    collections,
  };
}

export default async function ModuleRecordPage({ params }: RecordPageProps) {
  const { slug, id } = await params;
  const activeLocale = await getActiveLocale();
  const isEn = activeLocale === "en-US";
  const formatLocale = isEn ? "en-US" : "es-PY";
  const moduleDef = MODULE_BY_SLUG.get(slug);
  if (!moduleDef || moduleDef.kind === "report") {
    notFound();
  }
  if (moduleDef.slug === "properties") {
    redirect(`/module/properties/${encodeURIComponent(id)}`);
  }
  const moduleLabel = getModuleLabel(moduleDef, activeLocale);
  const moduleDescription = getModuleDescription(moduleDef, activeLocale);

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${moduleDef.endpoint}/${encodeURIComponent(id)}`;

  let record: Record<string, unknown> | null = null;
  let apiError: { kind: "connection" | "request"; message: string } | null =
    null;
  let requestStatus: number | null = null;
  let accessToken: string | null = null;
  let sessionUserId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token ?? null;
    sessionUserId = data.session?.user?.id ?? null;
    const token = accessToken;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.status === 404) {
      notFound();
    }

    if (response.ok) {
      record = (await response.json()) as Record<string, unknown>;
    } else {
      const details = await response.text().catch(() => "");
      const suffix = details ? `: ${details.slice(0, 240)}` : "";
      requestStatus = response.status;
      apiError = {
        kind: "request",
        message: `HTTP ${response.status} for ${moduleDef.endpoint}${suffix}`,
      };
    }
  } catch (err) {
    apiError = { kind: "connection", message: errorMessage(err) };
  }

  if (apiError || !record) {
    if (
      requestStatus === 403 &&
      apiError?.kind === "request" &&
      isOrgMembershipError(apiError.message)
    ) {
      const activeOrgId = await getActiveOrgId();
      return (
        <OrgAccessChanged
          description={
            isEn
              ? "This record belongs to an organization you no longer have access to. Clear your current selection and switch to an organization where you are a member."
              : "Este registro pertenece a una organización a la que no tienes acceso. Borra la selección actual y cámbiate a una organización de la que seas miembro."
          }
          orgId={activeOrgId}
          title={
            isEn ? "No access to this record" : "Sin acceso a este registro"
          }
        />
      );
    }

    const title =
      apiError?.kind === "request"
        ? isEn
          ? "API request failed"
          : "Falló la solicitud a la API"
        : isEn
          ? "API connection failed"
          : "Fallo de conexión a la API";
    const detail =
      apiError?.kind === "request"
        ? isEn
          ? "Could not load record details from the backend."
          : "No se pudieron cargar los detalles del registro desde el backend."
        : isEn
          ? "Could not connect to the backend to load record details."
          : "No se pudo conectar al backend para cargar los detalles del registro.";

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{detail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground text-sm">
          <p>
            {isEn ? "Backend base URL" : "URL base del backend"}:{" "}
            <code className="rounded bg-muted px-1 py-0.5">{baseUrl}</code>
          </p>
          {requestStatus ? (
            <p className="break-words">
              HTTP {requestStatus} for{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                {moduleDef.endpoint}
              </code>
            </p>
          ) : null}
          <p className="break-words">
            {apiError?.message ??
              (isEn ? "Unknown error" : "Error desconocido")}
          </p>
          <p>
            {isEn
              ? "Make sure FastAPI is running (from"
              : "Asegúrate de que FastAPI esté ejecutándose (desde"}{" "}
            <code className="rounded bg-muted px-1 py-0.5">apps/backend</code>)
            {isEn ? " on port 8000." : " en el puerto 8000."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const title = recordTitle(
    record,
    isEn ? "Record details" : "Detalles del registro"
  );
  const recordId = typeof record.id === "string" ? record.id : id;
  const href = `/module/${moduleDef.slug}/${recordId}`;
  const ownerUserId =
    moduleDef.slug === "organizations" &&
      typeof record.owner_user_id === "string"
      ? record.owner_user_id
      : null;

  let organizationMembers: OrganizationMemberRow[] = [];
  let organizationMembersError: string | null = null;
  let canManageMembers = false;
  let organizationInvites: OrganizationInviteRow[] = [];
  let organizationInvitesError: string | null = null;

  if (moduleDef.slug === "organizations") {
    try {
      const membersUrl = `${baseUrl}/organizations/${encodeURIComponent(recordId)}/members`;
      const response = await fetch(membersUrl, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (response.ok) {
        const data = (await response.json()) as { data?: unknown[] };
        organizationMembers = Array.isArray(data.data)
          ? data.data.filter(isOrganizationMemberRow)
          : [];
      } else {
        const details = await response.text().catch(() => "");
        const suffix = details ? `: ${details.slice(0, 240)}` : "";
        organizationMembersError = `HTTP ${response.status} for /organizations/${recordId}/members${suffix}`;
      }
    } catch (err) {
      organizationMembersError = errorMessage(err);
    }

    const me = sessionUserId
      ? organizationMembers.find((member) => member.user_id === sessionUserId)
      : null;
    canManageMembers = me?.role === "owner_admin";

    if (canManageMembers) {
      try {
        const invitesUrl = `${baseUrl}/organizations/${encodeURIComponent(recordId)}/invites`;
        const response = await fetch(invitesUrl, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });

        if (response.ok) {
          const data = (await response.json()) as { data?: unknown[] };
          organizationInvites = Array.isArray(data.data)
            ? data.data.filter(isOrganizationInviteRow)
            : [];
        } else {
          const details = await response.text().catch(() => "");
          const suffix = details ? `: ${details.slice(0, 240)}` : "";
          organizationInvitesError = `HTTP ${response.status} for /organizations/${recordId}/invites${suffix}`;
        }
      } catch (err) {
        organizationInvitesError = errorMessage(err);
      }
    }
  }

  let propertySnapshot: PropertyRelationSnapshot | null = null;
  if (moduleDef.slug === "properties") {
    const organizationId = asString(record.organization_id);
    if (organizationId) {
      propertySnapshot = await loadPropertyRelationSnapshot({
        accessToken,
        baseUrl,
        orgId: organizationId,
        propertyId: recordId,
      });
    }
  }

  const relatedLinks = (() => {
    const links: Array<{ href: string; label: string }> = [];
    const q = (key: string, value: string) =>
      `${key}=${encodeURIComponent(value)}`;

    if (moduleDef.slug === "organizations") {
      links.push({
        href: "/setup",
        label: isEn ? "Open onboarding setup" : "Abrir configuración",
      });
      links.push({
        href: "/module/properties",
        label: isEn ? "Properties" : "Propiedades",
      });
      links.push({ href: "/module/units", label: isEn ? "Units" : "Unidades" });
      links.push({
        href: "/module/channels",
        label: isEn ? "Channels" : "Canales",
      });
      links.push({
        href: "/module/listings",
        label: isEn ? "Listings" : "Anuncios",
      });
      links.push({
        href: "/module/reservations",
        label: isEn ? "Reservations" : "Reservas",
      });
      links.push({ href: "/module/tasks", label: isEn ? "Tasks" : "Tareas" });
      links.push({
        href: "/module/expenses",
        label: isEn ? "Expenses" : "Gastos",
      });
      links.push({
        href: "/module/owner-statements",
        label: isEn ? "Owner statements" : "Estados del propietario",
      });
      return links;
    }

    if (moduleDef.slug === "properties") {
      links.push({
        href: `/module/units?${q("property_id", recordId)}`,
        label: isEn ? "Units in this property" : "Unidades en esta propiedad",
      });
      links.push({
        href: `/module/tasks?${q("property_id", recordId)}`,
        label: isEn ? "Tasks in this property" : "Tareas de esta propiedad",
      });
      links.push({
        href: `/module/expenses?${q("property_id", recordId)}`,
        label: isEn ? "Expenses in this property" : "Gastos de esta propiedad",
      });
      links.push({
        href: `/module/owner-statements?${q("property_id", recordId)}`,
        label: isEn
          ? "Owner statements in this property"
          : "Estados del propietario de esta propiedad",
      });
      links.push({
        href: `/module/leases?${q("property_id", recordId)}`,
        label: isEn ? "Related leases" : "Contratos relacionados",
      });
      links.push({
        href: `/module/applications?${q("property_id", recordId)}`,
        label: isEn ? "Related applications" : "Aplicaciones relacionadas",
      });
      links.push({
        href: `/module/collections?${q("property_id", recordId)}`,
        label: isEn ? "Related collections" : "Cobros relacionados",
      });
      return links;
    }

    if (moduleDef.slug === "units") {
      links.push({
        href: `/module/listings?${q("unit_id", recordId)}`,
        label: isEn ? "Listings for this unit" : "Anuncios de esta unidad",
      });
      links.push({
        href: `/module/reservations?${q("unit_id", recordId)}`,
        label: isEn ? "Reservations for this unit" : "Reservas de esta unidad",
      });
      links.push({
        href: `/module/calendar?${q("unit_id", recordId)}`,
        label: isEn ? "Calendar for this unit" : "Calendario de esta unidad",
      });
      links.push({
        href: `/module/tasks?${q("unit_id", recordId)}`,
        label: isEn ? "Tasks for this unit" : "Tareas de esta unidad",
      });
      links.push({
        href: `/module/expenses?${q("unit_id", recordId)}`,
        label: isEn ? "Expenses for this unit" : "Gastos de esta unidad",
      });
      links.push({
        href: `/module/owner-statements?${q("unit_id", recordId)}`,
        label: isEn
          ? "Owner statements for this unit"
          : "Estados del propietario de esta unidad",
      });
      return links;
    }

    if (moduleDef.slug === "channels") {
      links.push({
        href: `/module/listings?${q("channel_id", recordId)}`,
        label: isEn ? "Listings in this channel" : "Anuncios en este canal",
      });
      links.push({
        href: `/module/reservations?${q("channel_id", recordId)}`,
        label: isEn ? "Reservations in this channel" : "Reservas de este canal",
      });
      return links;
    }

    if (moduleDef.slug === "listings") {
      links.push({
        href: `/module/reservations?${q("listing_id", recordId)}`,
        label: isEn
          ? "Reservations for this listing"
          : "Reservas de este anuncio",
      });
      return links;
    }

    if (moduleDef.slug === "guests") {
      links.push({
        href: `/module/reservations?${q("guest_id", recordId)}`,
        label: isEn
          ? "Reservations for this guest"
          : "Reservas de este huésped",
      });
      return links;
    }

    if (moduleDef.slug === "reservations") {
      links.push({
        href: `/module/tasks?${q("reservation_id", recordId)}`,
        label: isEn ? "Tasks for this reservation" : "Tareas de esta reserva",
      });
      links.push({
        href: `/module/expenses?${q("reservation_id", recordId)}`,
        label: isEn
          ? "Expenses for this reservation"
          : "Gastos de esta reserva",
      });
      return links;
    }

    return links;
  })();

  const ownerStatementLineItems =
    moduleDef.slug === "owner-statements"
      ? toStatementLineItems(record.line_items)
      : [];
  const ownerStatementReconciliation =
    moduleDef.slug === "owner-statements"
      ? toStatementReconciliation(record.reconciliation)
      : null;
  const ownerStatementCurrency =
    moduleDef.slug === "owner-statements" && typeof record.currency === "string"
      ? record.currency
      : "PYG";

  const sourceHrefBaseByTable: Record<string, string> = {
    reservations: "/module/reservations",
    collection_records: "/module/collections",
    leases: "/module/leases",
    expenses: "/module/expenses",
  };

  const propertyOverview =
    moduleDef.slug === "properties" && propertySnapshot
      ? (() => {
        const units = propertySnapshot.units;
        const tasks = propertySnapshot.tasks;
        const expenses = propertySnapshot.expenses;
        const ownerStatements = propertySnapshot.ownerStatements;
        const leases = propertySnapshot.leases;
        const reservations = propertySnapshot.reservations;
        const listings = propertySnapshot.listings;
        const applications = propertySnapshot.applications;
        const collections = propertySnapshot.collections;

        const openTasks = tasks.filter(
          (row) => !TASK_CLOSED_STATUSES.has(normalizedStatus(row.status))
        );
        const activeLeases = leases.filter((row) =>
          LEASE_ACTIVE_STATUSES.has(normalizedStatus(row.lease_status))
        );
        const activeReservations = reservations.filter((row) =>
          ACTIVE_RESERVATION_STATUSES.has(normalizedStatus(row.status))
        );
        const publishedListings = listings.filter(
          (row) => asBoolean(row.is_published) === true
        );
        const pipelineApplications = applications.filter(
          (row) =>
            !APPLICATION_CLOSED_STATUSES.has(normalizedStatus(row.status))
        );
        const openCollections = collections.filter((row) =>
          COLLECTION_OPEN_STATUSES.has(normalizedStatus(row.status))
        );

        const occupiedUnitIds = new Set(
          activeLeases
            .map((row) => asString(row.unit_id))
            .filter((unitId): unitId is string => Boolean(unitId))
        );
        const occupancyRate = units.length
          ? Math.round((occupiedUnitIds.size / units.length) * 100)
          : null;

        const now = new Date();
        const monthPrefix = now.toISOString().slice(0, 7);
        const monthLabel = new Intl.DateTimeFormat(formatLocale, {
          month: "short",
          year: "numeric",
        }).format(now);
        const monthExpenses = expenses.filter((row) =>
          asString(row.expense_date).startsWith(monthPrefix)
        );
        const monthExpensePyg = monthExpenses.reduce(
          (total, row) => total + getAmountInPyg(row),
          0
        );
        const paidCollectionsThisMonth = collections.filter((row) => {
          const status = normalizedStatus(row.status);
          if (!COLLECTION_PAID_STATUSES.has(status)) return false;
          return (
            asString(row.paid_at).startsWith(monthPrefix) ||
            asString(row.due_date).startsWith(monthPrefix)
          );
        });
        const openCollectionsThisMonth = openCollections.filter((row) =>
          asString(row.due_date).startsWith(monthPrefix)
        );
        const collectedPyg = [
          ...paidCollectionsThisMonth,
          ...openCollectionsThisMonth,
        ].reduce((total, row) => {
          const amount = toNumber(row.amount) ?? 0;
          const currency = asString(row.currency) || "PYG";
          const fxRate = toNumber(row.fx_rate_to_pyg);
          return total + convertAmountToPyg(amount, currency, fxRate);
        }, 0);
        const projectedRentPyg = activeLeases.reduce((total, row) => {
          const amount = toNumber(row.monthly_rent) ?? 0;
          const currency = asString(row.currency) || "PYG";
          return total + convertAmountToPyg(amount, currency, null);
        }, 0);
        const monthIncomePyg =
          collectedPyg > 0 ? collectedPyg : projectedRentPyg;
        const monthNetIncomePyg = monthIncomePyg - monthExpensePyg;

        const activeLeaseByUnitId = new Map<
          string,
          Record<string, unknown>
        >();
        for (const lease of activeLeases) {
          const unitId = asString(lease.unit_id);
          if (!unitId || activeLeaseByUnitId.has(unitId)) continue;
          activeLeaseByUnitId.set(unitId, lease);
        }
        const openTasksByUnitId = new Map<
          string,
          Record<string, unknown>[]
        >();
        for (const task of openTasks) {
          const unitId = asString(task.unit_id);
          if (!unitId) continue;
          const bucket = openTasksByUnitId.get(unitId);
          if (bucket) bucket.push(task);
          else openTasksByUnitId.set(unitId, [task]);
        }
        const openCollectionsByLeaseId = new Map<
          string,
          Record<string, unknown>[]
        >();
        for (const collection of openCollections) {
          const leaseId = asString(collection.lease_id);
          if (!leaseId) continue;
          const bucket = openCollectionsByLeaseId.get(leaseId);
          if (bucket) bucket.push(collection);
          else openCollectionsByLeaseId.set(leaseId, [collection]);
        }
        for (const rows of openCollectionsByLeaseId.values()) {
          rows.sort((left, right) => {
            const leftDate =
              toDate(left.due_date) ?? new Date(8_640_000_000_000_000);
            const rightDate =
              toDate(right.due_date) ?? new Date(8_640_000_000_000_000);
            return leftDate.getTime() - rightDate.getTime();
          });
        }

        const latestStatement = [...ownerStatements].sort((left, right) => {
          const leftDate =
            toDate(getFirstValue(left, ["period_end", "generated_at"])) ??
            new Date(0);
          const rightDate =
            toDate(getFirstValue(right, ["period_end", "generated_at"])) ??
            new Date(0);
          return rightDate.getTime() - leftDate.getTime();
        })[0];

        const unitsPreview = [...units].sort((left, right) => {
          const leftLabel = getFirstValue(left, ["code", "name", "id"]) ?? "";
          const rightLabel =
            getFirstValue(right, ["code", "name", "id"]) ?? "";
          return leftLabel.localeCompare(rightLabel);
        });

        const unitCards = unitsPreview.slice(0, 6).map((unit) => {
          const unitId = asString(unit.id);
          const lease = activeLeaseByUnitId.get(unitId);
          const tenantName = lease
            ? getFirstValue(lease, ["tenant_full_name", "tenant_name"])
            : null;
          const leaseId = lease ? asString(lease.id) : "";
          const nextCollection =
            leaseId && openCollectionsByLeaseId.has(leaseId)
              ? (openCollectionsByLeaseId.get(leaseId)?.[0] ?? null)
              : null;
          const unitTasks = unitId
            ? (openTasksByUnitId.get(unitId) ?? [])
            : [];
          const urgentTask = unitTasks.find((task) => {
            const dueDate = toDate(task.due_at);
            const isPastDue =
              dueDate !== null && dueDate.getTime() < now.getTime();
            const highPriority = URGENT_TASK_PRIORITIES.has(
              normalizedStatus(task.priority)
            );
            return isPastDue || highPriority;
          });
          const taskCount = unitTasks.length;
          const statusTone = urgentTask
            ? ("maintenance" as const)
            : lease
              ? ("occupied" as const)
              : ("vacant" as const);
          const statusLabel = isEn
            ? statusTone === "occupied"
              ? "Occupied"
              : statusTone === "maintenance"
                ? "Attention"
                : "Vacant"
            : statusTone === "occupied"
              ? "Ocupada"
              : statusTone === "maintenance"
                ? "Atención"
                : "Vacante";
          const monthlyRentPyg = lease
            ? convertAmountToPyg(
              toNumber(lease.monthly_rent) ?? 0,
              asString(lease.currency) || "PYG",
              null
            )
            : 0;

          return {
            id:
              unitId || getFirstValue(unit, ["id", "code", "name"]) || "unit",
            unitId,
            label: getFirstValue(unit, ["code", "name", "id"]) ?? "-",
            subtitle: getFirstValue(unit, ["name", "code"]) ?? "-",
            statusTone,
            statusLabel,
            tenantName:
              tenantName ??
              (isEn ? "No active tenant" : "Sin inquilino activo"),
            monthlyRentPyg,
            nextCollectionDue:
              nextCollection && asString(nextCollection.due_date)
                ? asDateLabel(asString(nextCollection.due_date), formatLocale)
                : null,
            openTaskCount: taskCount,
          };
        });

        const urgentTasks = [...openTasks]
          .filter((task) => {
            const dueDate = toDate(task.due_at);
            const isPastDue =
              dueDate !== null && dueDate.getTime() < now.getTime();
            const highPriority = URGENT_TASK_PRIORITIES.has(
              normalizedStatus(task.priority)
            );
            return isPastDue || highPriority;
          })
          .sort((left, right) => {
            const leftDue =
              toDate(left.due_at) ?? new Date(8_640_000_000_000_000);
            const rightDue =
              toDate(right.due_at) ?? new Date(8_640_000_000_000_000);
            return leftDue.getTime() - rightDue.getTime();
          });
        const overdueCollections = [...openCollections]
          .filter((row) => {
            const dueDate = toDate(row.due_date);
            return dueDate !== null && dueDate.getTime() < now.getTime();
          })
          .sort((left, right) => {
            const leftDue =
              toDate(left.due_date) ?? new Date(8_640_000_000_000_000);
            const rightDue =
              toDate(right.due_date) ?? new Date(8_640_000_000_000_000);
            return leftDue.getTime() - rightDue.getTime();
          });
        const leasesExpiringSoon = [...activeLeases]
          .filter((lease) => {
            const endsOn = toDate(lease.ends_on);
            if (!endsOn) return false;
            const daysUntil = daysUntilDate(endsOn, now);
            return daysUntil >= 0 && daysUntil <= 60;
          })
          .sort((left, right) => {
            const leftDate =
              toDate(left.ends_on) ?? new Date(8_640_000_000_000_000);
            const rightDate =
              toDate(right.ends_on) ?? new Date(8_640_000_000_000_000);
            return leftDate.getTime() - rightDate.getTime();
          });
        const attentionItems: Array<{
          id: string;
          title: string;
          detail: string;
          href: string;
          tone: "danger" | "warning" | "info";
          ctaLabel: string;
        }> = [];
        for (const row of overdueCollections.slice(0, 2)) {
          const collectionId = asString(row.id);
          const leaseId = asString(row.lease_id);
          const dueDate = asDateLabel(asString(row.due_date), formatLocale);
          const amount = convertAmountToPyg(
            toNumber(row.amount) ?? 0,
            asString(row.currency) || "PYG",
            toNumber(row.fx_rate_to_pyg)
          );
          attentionItems.push({
            id: `collection:${collectionId || leaseId || attentionItems.length}`,
            title: isEn ? "Overdue collection" : "Cobro vencido",
            detail: `${formatCurrency(amount, "PYG", formatLocale)} · ${dueDate ?? (isEn ? "No due date" : "Sin vencimiento")
              }`,
            href: `/module/collections${collectionId
              ? `/${collectionId}`
              : `?property_id=${encodeURIComponent(recordId)}`
              }`,
            tone: "danger",
            ctaLabel: isEn ? "Review" : "Revisar",
          });
        }
        for (const row of urgentTasks.slice(0, 2)) {
          const taskId = asString(row.id);
          const dueDate = asDateLabel(asString(row.due_at), formatLocale);
          attentionItems.push({
            id: `task:${taskId || attentionItems.length}`,
            title: getFirstValue(row, ["title", "type", "id"]) ?? "-",
            detail: dueDate
              ? isEn
                ? `Due ${dueDate}`
                : `Vence ${dueDate}`
              : isEn
                ? "Task needs attention"
                : "La tarea requiere atención",
            href: taskId
              ? `/module/tasks/${taskId}`
              : `/module/tasks?property_id=${encodeURIComponent(recordId)}`,
            tone: "warning",
            ctaLabel: isEn ? "Open task" : "Abrir tarea",
          });
        }
        for (const row of leasesExpiringSoon.slice(0, 2)) {
          const leaseId = asString(row.id);
          const endsOn = toDate(row.ends_on);
          const daysLeft = endsOn ? daysUntilDate(endsOn, now) : null;
          const tenantName =
            getFirstValue(row, ["tenant_full_name", "tenant_name"]) ?? "-";
          attentionItems.push({
            id: `lease:${leaseId || attentionItems.length}`,
            title: isEn ? "Lease ending soon" : "Contrato por vencer",
            detail:
              daysLeft === null
                ? tenantName
                : isEn
                  ? `${tenantName} · ${daysLeft} days left`
                  : `${tenantName} · faltan ${daysLeft} días`,
            href: leaseId
              ? `/module/leases/${leaseId}`
              : `/module/leases?property_id=${encodeURIComponent(recordId)}`,
            tone: "info",
            ctaLabel: isEn ? "Open lease" : "Ver contrato",
          });
        }
        const expenseByCategory = [...monthExpenses].reduce<
          Record<string, number>
        >((acc, row) => {
          const key =
            getFirstValue(row, ["category", "vendor_name"]) || "other";
          acc[key] = (acc[key] ?? 0) + getAmountInPyg(row);
          return acc;
        }, {});
        const expenseCategoryBreakdown = Object.entries(expenseByCategory)
          .map(([category, amount]) => ({ category, amount }))
          .sort((left, right) => right.amount - left.amount)
          .slice(0, 3);

        return {
          unitCount: units.length,
          activeLeaseCount: activeLeases.length,
          activeReservationCount: activeReservations.length,
          openTaskCount: openTasks.length,
          publishedListingCount: publishedListings.length,
          pipelineApplicationCount: pipelineApplications.length,
          openCollectionCount: openCollections.length,
          ownerStatementCount: ownerStatements.length,
          occupancyRate,
          monthLabel,
          monthIncomePyg,
          monthExpensePyg,
          monthNetIncomePyg,
          projectedRentPyg,
          latestStatement: latestStatement ?? null,
          attentionItems: attentionItems.slice(0, 6),
          unitCards,
          expenseCategoryBreakdown,
        };
      })()
      : null;

  const keys = sortKeys(Object.keys(record)).filter((key) => {
    if (moduleDef.slug !== "owner-statements") return true;
    return key !== "line_items" && key !== "reconciliation";
  });
  const propertyLocationLabel =
    moduleDef.slug === "properties"
      ? [
        getFirstValue(record, ["district", "neighborhood", "city"]),
        getFirstValue(record, ["address", "street_address", "location"]),
      ]
        .filter((value): value is string => Boolean(value))
        .join(" · ")
      : "";
  const propertyCodeLabel =
    moduleDef.slug === "properties"
      ? getFirstValue(record, ["code", "public_name", "id"])
      : null;

  return (
    <div className="space-y-6">
      <RecordRecent href={href} label={title} meta={moduleLabel} />
      {moduleDef.slug !== "properties" && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{isEn ? "Record" : "Registro"}</Badge>
                  <Badge className="text-[11px]" variant="secondary">
                    {moduleLabel}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription>{moduleDescription}</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                  href={`/module/${moduleDef.slug}`}
                >
                  <Icon icon={ArrowLeft01Icon} size={16} />
                  {isEn ? "Back to module" : "Volver al módulo"}
                </Link>
                <CopyButton
                  label={isEn ? "Copy ID" : "Copiar ID"}
                  value={recordId}
                />
                <PinButton href={href} label={title} meta={moduleLabel} />
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {moduleDef.slug === "owner-statements" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {isEn ? "Reconciliation panel" : "Panel de conciliación"}
            </CardTitle>
            <CardDescription>
              {isEn
                ? "Review line by line how this owner statement was calculated."
                : "Verifica línea por línea el cálculo de este estado del propietario."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ownerStatementReconciliation ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-muted-foreground text-xs">
                    {isEn
                      ? "Gross total (reservations + collections)"
                      : "Total bruto (reserva + cobros)"}
                  </p>
                  <p className="font-semibold text-base">
                    {formatCurrency(
                      ownerStatementReconciliation.gross_total ?? 0,
                      ownerStatementCurrency,
                      formatLocale
                    )}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-muted-foreground text-xs">
                    {isEn ? "Computed net" : "Neto calculado"}
                  </p>
                  <p className="font-semibold text-base">
                    {formatCurrency(
                      ownerStatementReconciliation.computed_net_payout ?? 0,
                      ownerStatementCurrency,
                      formatLocale
                    )}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-muted-foreground text-xs">
                    {isEn ? "Stored net" : "Neto guardado"}
                  </p>
                  <p className="font-semibold text-base">
                    {formatCurrency(
                      ownerStatementReconciliation.stored_net_payout ?? 0,
                      ownerStatementCurrency,
                      formatLocale
                    )}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3",
                    reconciliationDiffClass(
                      ownerStatementReconciliation.stored_vs_computed_diff ?? 0
                    )
                  )}
                >
                  <p className="text-xs">
                    {isEn
                      ? "Stored vs computed difference"
                      : "Diferencia guardado vs calculado"}
                  </p>
                  <p className="font-semibold text-base">
                    {formatCurrency(
                      ownerStatementReconciliation.stored_vs_computed_diff ?? 0,
                      ownerStatementCurrency,
                      formatLocale
                    )}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="rounded-md border">
              <div className="grid grid-cols-[1.2fr_1.1fr_1fr_0.9fr] gap-3 border-b bg-muted/35 px-3 py-2">
                <p className="font-medium text-muted-foreground text-xs">
                  {isEn ? "Concept" : "Concepto"}
                </p>
                <p className="font-medium text-muted-foreground text-xs">
                  {isEn ? "Source" : "Origen"}
                </p>
                <p className="font-medium text-muted-foreground text-xs">
                  {isEn ? "Date" : "Fecha"}
                </p>
                <p className="text-right font-medium text-muted-foreground text-xs">
                  {isEn ? "Amount (PYG)" : "Monto (PYG)"}
                </p>
              </div>
              <div className="max-h-[28rem] divide-y overflow-auto">
                {ownerStatementLineItems.length ? (
                  ownerStatementLineItems.map((line, index) => {
                    const sourceBase = sourceHrefBaseByTable[line.source_table];
                    const sourceHref =
                      sourceBase && isUuid(line.source_id)
                        ? `${sourceBase}/${line.source_id}`
                        : null;

                    const dateLabel =
                      line.date ??
                      (line.from && line.to
                        ? `${line.from} → ${line.to}`
                        : "-");

                    return (
                      <div
                        className="grid grid-cols-[1.2fr_1.1fr_1fr_0.9fr] gap-3 px-3 py-2.5"
                        key={`${line.source_table}:${line.source_id}:${index}`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate font-medium text-sm">
                            {humanizeKey(line.bucket)}
                          </p>
                          <p className="truncate text-muted-foreground text-xs">
                            {humanizeKey(line.kind)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          {sourceHref ? (
                            <Link
                              className="font-mono text-primary text-xs underline-offset-4 hover:underline"
                              href={sourceHref}
                              prefetch={false}
                            >
                              {line.source_table}:{shortId(line.source_id)}
                            </Link>
                          ) : (
                            <p className="font-mono text-muted-foreground text-xs">
                              {line.source_table}:{shortId(line.source_id)}
                            </p>
                          )}
                        </div>
                        <p className="text-foreground text-xs">{dateLabel}</p>
                        <p className="text-right text-sm tabular-nums">
                          {formatCurrency(
                            line.amount_pyg,
                            ownerStatementCurrency,
                            formatLocale
                          )}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-muted-foreground text-sm">
                    {isEn
                      ? "This statement does not expose reconciliation lines yet."
                      : "Este estado aún no expone líneas de conciliación."}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {propertyOverview
        ? (() => {
          const occupancyValue = Math.max(
            0,
            Math.min(propertyOverview.occupancyRate ?? 0, 100)
          );
          const hasIncome = propertyOverview.monthIncomePyg > 0;
          const expenseRatio = hasIncome
            ? Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (propertyOverview.monthExpensePyg /
                    propertyOverview.monthIncomePyg) *
                  100
                )
              )
            )
            : 0;
          const netIncomePositive = propertyOverview.monthNetIncomePyg >= 0;
          const latestStatementId = propertyOverview.latestStatement
            ? asString(propertyOverview.latestStatement.id)
            : "";
          const workflowSteps = [
            {
              id: "listings",
              icon: Door01Icon,
              label: isEn ? "Listings" : "Anuncios",
              value: propertyOverview.publishedListingCount,
              description: isEn ? "Live in marketplace" : "Publicados",
              href: `/module/marketplace-listings?property_id=${encodeURIComponent(recordId)}`,
            },
            {
              id: "applications",
              icon: UserGroupIcon,
              label: isEn ? "Applications" : "Aplicaciones",
              value: propertyOverview.pipelineApplicationCount,
              description: isEn ? "In qualification" : "En calificación",
              href: `/module/applications?property_id=${encodeURIComponent(recordId)}`,
            },
            {
              id: "leases",
              icon: Calendar02Icon,
              label: isEn ? "Leases" : "Contratos",
              value: propertyOverview.activeLeaseCount,
              description: isEn ? "Currently active" : "Activos",
              href: `/module/leases?property_id=${encodeURIComponent(recordId)}`,
            },
            {
              id: "collections",
              icon: Invoice01Icon,
              label: isEn ? "Collections" : "Cobros",
              value: propertyOverview.openCollectionCount,
              description: isEn
                ? "Require follow-up"
                : "Requieren seguimiento",
              href: `/module/collections?property_id=${encodeURIComponent(recordId)}`,
            },
          ] as const;

          return (
            <div className="space-y-4">
              <Card className="overflow-hidden border-border/60 bg-card/50 backdrop-blur-md shadow-sm">
                <CardContent className="p-0">
                  <section className="relative overflow-hidden bg-[#fdfcfb] dark:bg-neutral-900/40">
                    {/* Artistic Glows */}
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute -top-40 right-10 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
                      <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-slate-200/10 blur-3xl dark:bg-white/5" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6)_0%,transparent_100%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)]" />
                    </div>

                    {/* Discrete Building Icon */}
                    <div className="absolute -right-16 -top-16 opacity-[0.03] dark:opacity-[0.08]">
                      <Icon icon={Building03Icon} size={320} />
                    </div>

                    <div className="relative grid gap-8 p-6 md:p-8 xl:grid-cols-[1fr_320px]">
                      <div className="flex flex-col justify-between space-y-8">
                        {/* Top Header Section */}
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                className={cn(
                                  buttonVariants({ variant: "secondary", size: "sm" }),
                                  "h-7 rounded-lg bg-background/50 hover:bg-background/80 border-border/10 px-2.5 text-[10px] font-bold tracking-wider uppercase transition-all"
                                )}
                                href={`/module/${moduleDef.slug}`}
                              >
                                <Icon icon={ArrowLeft01Icon} size={12} />
                                {isEn ? "Back" : "Volver"}
                              </Link>
                              <Badge className="h-7 border-border/10 bg-background/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm" variant="outline">
                                {moduleLabel}
                              </Badge>
                              <Badge className="h-7 border-primary/20 bg-primary/5 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm">
                                {propertyCodeLabel ?? recordId}
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                {title}
                              </h2>
                              <p className="text-sm font-medium text-muted-foreground max-w-2xl leading-relaxed">
                                {propertyLocationLabel || moduleDescription}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <CopyButton
                              className="h-9 w-9 rounded-xl border-border/40 bg-background/40 hover:bg-background/80"
                              value={recordId}
                            />
                            <PinButton
                              className="h-9 w-9 rounded-xl border-border/40 bg-background/40 hover:bg-background/80"
                              href={href}
                              label={title}
                              meta={moduleLabel}
                            />
                          </div>
                        </div>

                        {/* Quick Action Buttons Integrated */}
                        <div className="flex flex-wrap gap-2.5">
                          <Link
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/40 bg-background/60 px-4 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-background/90"
                            href={`/module/units?property_id=${encodeURIComponent(recordId)}`}
                          >
                            <Icon icon={Door01Icon} size={15} />
                            {isEn ? "Units" : "Unidades"}
                          </Link>
                          <Link
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/40 bg-background/60 px-4 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-background/90"
                            href={`/module/leases?property_id=${encodeURIComponent(recordId)}`}
                          >
                            <Icon icon={Calendar02Icon} size={15} />
                            {isEn ? "Leases" : "Contratos"}
                          </Link>
                          <Link
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/40 bg-background/60 px-4 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-background/90"
                            href={`/module/reports?property_id=${encodeURIComponent(recordId)}`}
                          >
                            <Icon icon={ChartIcon} size={15} />
                            {isEn ? "Analytics" : "Analíticos"}
                          </Link>
                        </div>
                      </div>

                      {/* Integrated Stats Panel */}
                      <div className="rounded-[24px] border border-border/20 bg-background/30 p-4 backdrop-blur-xl shadow-inner">
                        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                          <div className="rounded-2xl border border-border/10 bg-card/40 p-3.5 shadow-sm">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              {isEn ? "Occupancy" : "Ocupación"}
                            </p>
                            <p className="mt-1.5 font-bold text-3xl tabular-nums text-foreground">
                              {propertyOverview.occupancyRate !== null
                                ? `${propertyOverview.occupancyRate}%`
                                : "-"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/10 bg-card/40 p-3.5 shadow-sm">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              {isEn ? "Projected Rent" : "Renta Proyectada"}
                            </p>
                            <p className="mt-1.5 font-bold text-xl tabular-nums text-foreground">
                              {formatCurrency(
                                propertyOverview.projectedRentPyg,
                                "PYG",
                                formatLocale
                              )}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/10 bg-card/40 p-3.5 shadow-sm">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              {isEn ? "Active Leases" : "Contratos Activos"}
                            </p>
                            <p className="mt-1.5 font-bold text-3xl tabular-nums text-foreground">
                              {propertyOverview.activeLeaseCount}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <section className="space-y-4">
                  <Card className="border-border/80 bg-card/98">
                    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                      <div>
                        <CardTitle className="text-xl">
                          {isEn ? "Unit matrix" : "Matriz de unidades"}
                        </CardTitle>
                        <CardDescription>
                          {isEn
                            ? "Each unit pulls lease, tasks, and collection status."
                            : "Cada unidad combina su contrato, tareas y cobros."}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className={cn(
                            buttonVariants({
                              size: "sm",
                              variant: "outline",
                            }),
                            "h-8 px-2.5"
                          )}
                          href={`/module/units?property_id=${encodeURIComponent(recordId)}`}
                        >
                          {isEn ? "View all units" : "Ver unidades"}
                        </Link>
                        <Link
                          className={cn(
                            buttonVariants({
                              size: "sm",
                              variant: "secondary",
                            }),
                            "h-8 px-2.5"
                          )}
                          href={`/module/units?property_id=${encodeURIComponent(recordId)}`}
                        >
                          {isEn ? "Add unit" : "Agregar unidad"}
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {propertyOverview.unitCards.length ? (
                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                          {propertyOverview.unitCards.map((unit) => {
                            const unitHref =
                              unit.unitId && isUuid(unit.unitId)
                                ? `/module/units/${unit.unitId}`
                                : `/module/units?property_id=${encodeURIComponent(recordId)}`;
                            const statusToneClass =
                              unit.statusTone === "occupied"
                                ? "status-tone-success"
                                : unit.statusTone === "maintenance"
                                  ? "status-tone-warning"
                                  : "status-tone-info";

                            return (
                              <article
                                className="flex h-full flex-col rounded-2xl border border-border/75 bg-background/75 p-3"
                                key={unit.id}
                              >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <Link
                                      className="truncate font-semibold text-base underline-offset-4 hover:underline"
                                      href={unitHref}
                                    >
                                      {unit.label}
                                    </Link>
                                    <p className="truncate text-muted-foreground text-xs">
                                      {unit.subtitle}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 rounded-full border px-2 py-0.5 font-medium text-[11px]",
                                      statusToneClass
                                    )}
                                  >
                                    {unit.statusLabel}
                                  </span>
                                </div>

                                <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-2.5 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">
                                      {isEn ? "Tenant" : "Inquilino"}
                                    </p>
                                    <p className="truncate font-medium text-sm">
                                      {unit.tenantName}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-muted-foreground">
                                      {isEn
                                        ? "Monthly rent"
                                        : "Renta mensual"}
                                    </p>
                                    <p className="font-medium tabular-nums">
                                      {formatCurrency(
                                        unit.monthlyRentPyg,
                                        "PYG",
                                        formatLocale
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-2">
                                  <p className="text-muted-foreground text-xs">
                                    {unit.nextCollectionDue
                                      ? isEn
                                        ? `Next due ${unit.nextCollectionDue}`
                                        : `Próximo cobro ${unit.nextCollectionDue}`
                                      : isEn
                                        ? "No upcoming collection"
                                        : "Sin cobro próximo"}
                                  </p>
                                  <Link
                                    className={cn(
                                      buttonVariants({
                                        size: "sm",
                                        variant: "outline",
                                      }),
                                      "h-7 px-2 text-xs"
                                    )}
                                    href={unitHref}
                                  >
                                    {isEn ? "Open" : "Abrir"}
                                  </Link>
                                </div>
                                <p className="mt-2 inline-flex items-center gap-1 text-muted-foreground text-xs">
                                  <Icon icon={Task01Icon} size={13} />
                                  {unit.openTaskCount}{" "}
                                  {isEn
                                    ? unit.openTaskCount === 1
                                      ? "open task"
                                      : "open tasks"
                                    : unit.openTaskCount === 1
                                      ? "tarea abierta"
                                      : "tareas abiertas"}
                                </p>
                              </article>
                            );
                          })}
                          {propertyOverview.unitCards.length < 6 ? (
                            <Link
                              className="group flex min-h-[14.5rem] items-center justify-center rounded-2xl border border-border/75 border-dashed bg-muted/20 p-4 text-center transition-colors hover:bg-muted/30"
                              href={`/module/units?property_id=${encodeURIComponent(recordId)}`}
                            >
                              <div className="space-y-1">
                                <p className="font-medium text-sm">
                                  {isEn
                                    ? "Add another unit"
                                    : "Agregar unidad"}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {isEn
                                    ? "Keep occupancy and lease tracking complete."
                                    : "Mantén completo el seguimiento de ocupación y contratos."}
                                </p>
                              </div>
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-border/75 border-dashed bg-muted/20 p-5">
                          <p className="font-medium text-sm">
                            {isEn
                              ? "No units yet for this property."
                              : "Esta propiedad aún no tiene unidades."}
                          </p>
                          <p className="mt-1 text-muted-foreground text-sm">
                            {isEn
                              ? "Start by creating your first unit to unlock leasing, maintenance, and collections."
                              : "Empieza creando la primera unidad para activar contratos, mantenimiento y cobros."}
                          </p>
                          <Link
                            className={cn(
                              buttonVariants({
                                size: "sm",
                                variant: "secondary",
                              }),
                              "mt-3 h-8 px-2.5"
                            )}
                            href={`/module/units?property_id=${encodeURIComponent(recordId)}`}
                          >
                            {isEn
                              ? "Create first unit"
                              : "Crear primera unidad"}
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-card/98">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {isEn ? "Workflow lane" : "Flujo operativo"}
                      </CardTitle>
                      <CardDescription>
                        {isEn
                          ? "From listing to collection, track each step in one place."
                          : "Desde anuncio hasta cobro, controla cada etapa en un solo lugar."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {workflowSteps.map((step) => (
                        <Link
                          className="rounded-2xl border border-border/70 bg-background/70 p-3 transition-colors hover:bg-muted/25"
                          href={step.href}
                          key={step.id}
                        >
                          <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-muted/35">
                            <Icon icon={step.icon} size={14} />
                          </div>
                          <p className="font-medium text-sm">{step.label}</p>
                          <p className="font-semibold text-xl tabular-nums">
                            {step.value}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {step.description}
                          </p>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                </section>

                <section className="space-y-4">
                  <Card className="border-border/80 bg-card/98">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <Icon icon={ChartIcon} size={18} />
                          {isEn ? "Financial pulse" : "Pulso financiero"}
                        </CardTitle>
                        <Link
                          className={cn(
                            buttonVariants({
                              size: "sm",
                              variant: "outline",
                            }),
                            "h-8 px-2"
                          )}
                          href={`/module/reports?property_id=${encodeURIComponent(recordId)}`}
                        >
                          {isEn ? "Report" : "Reporte"}
                        </Link>
                      </div>
                      <CardDescription>
                        {isEn
                          ? `Snapshot for ${propertyOverview.monthLabel}`
                          : `Resumen de ${propertyOverview.monthLabel}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                        <p className="text-muted-foreground text-xs">
                          {isEn ? "Net income" : "Ingreso neto"}
                        </p>
                        <p className="font-semibold text-3xl tabular-nums tracking-tight">
                          {formatCurrency(
                            propertyOverview.monthNetIncomePyg,
                            "PYG",
                            formatLocale
                          )}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            netIncomePositive
                              ? "text-[var(--status-success-fg)]"
                              : "text-[var(--status-danger-fg)]"
                          )}
                        >
                          {netIncomePositive
                            ? isEn
                              ? "Positive month-to-date margin."
                              : "Margen mensual positivo."
                            : isEn
                              ? "Expenses exceed collected income."
                              : "Los gastos superan el ingreso cobrado."}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                          <p className="text-muted-foreground text-xs">
                            {isEn ? "Income" : "Ingreso"}
                          </p>
                          <p className="font-semibold text-lg tabular-nums">
                            {formatCurrency(
                              propertyOverview.monthIncomePyg,
                              "PYG",
                              formatLocale
                            )}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                          <p className="text-muted-foreground text-xs">
                            {isEn ? "Expenses" : "Gastos"}
                          </p>
                          <p className="font-semibold text-lg tabular-nums">
                            {formatCurrency(
                              propertyOverview.monthExpensePyg,
                              "PYG",
                              formatLocale
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <p className="text-muted-foreground">
                              {isEn ? "Occupancy" : "Ocupación"}
                            </p>
                            <p className="font-medium tabular-nums">
                              {occupancyValue}%
                            </p>
                          </div>
                          <Progress value={occupancyValue} />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <p className="text-muted-foreground">
                              {isEn ? "Expense ratio" : "Ratio de gasto"}
                            </p>
                            <p className="font-medium tabular-nums">
                              {hasIncome ? `${expenseRatio}%` : "-"}
                            </p>
                          </div>
                          <Progress value={expenseRatio} />
                        </div>
                      </div>

                      {propertyOverview.expenseCategoryBreakdown.length ? (
                        <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                          <p className="font-medium text-sm">
                            {isEn
                              ? "Expense breakdown"
                              : "Desglose de gastos"}
                          </p>
                          {propertyOverview.expenseCategoryBreakdown.map(
                            (row) => {
                              const categoryShare =
                                propertyOverview.monthExpensePyg > 0
                                  ? Math.round(
                                    (row.amount /
                                      propertyOverview.monthExpensePyg) *
                                    100
                                  )
                                  : 0;
                              return (
                                <div className="space-y-1" key={row.category}>
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <p className="truncate">
                                      {humanizeKey(row.category)}
                                    </p>
                                    <p className="font-medium tabular-nums">
                                      {formatCurrency(
                                        row.amount,
                                        "PYG",
                                        formatLocale
                                      )}
                                    </p>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-foreground/75"
                                      style={{
                                        width: `${Math.max(
                                          6,
                                          Math.min(categoryShare, 100)
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : null}

                      {propertyOverview.latestStatement ? (
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">
                              {isEn
                                ? "Latest owner statement"
                                : "Último estado del propietario"}
                            </p>
                            <StatusBadge
                              value={asString(
                                propertyOverview.latestStatement.status
                              )}
                            />
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatCurrency(
                              toNumber(
                                propertyOverview.latestStatement.net_payout
                              ) ?? 0,
                              asString(
                                propertyOverview.latestStatement.currency
                              ) || "PYG",
                              formatLocale
                            )}
                          </p>
                          {latestStatementId && isUuid(latestStatementId) ? (
                            <Link
                              className="mt-2 inline-flex text-primary text-xs underline-offset-4 hover:underline"
                              href={`/module/owner-statements/${latestStatementId}`}
                            >
                              {isEn ? "Open statement" : "Abrir estado"}
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-card/98">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <Icon icon={Task01Icon} size={18} />
                          {isEn ? "Urgent attention" : "Atención urgente"}
                        </CardTitle>
                        <Link
                          className={cn(
                            buttonVariants({
                              size: "sm",
                              variant: "outline",
                            }),
                            "h-8 px-2"
                          )}
                          href={`/module/tasks?property_id=${encodeURIComponent(recordId)}`}
                        >
                          {isEn ? "All tasks" : "Todas"}
                        </Link>
                      </div>
                      <CardDescription>
                        {isEn
                          ? "Items that can impact occupancy, cash flow, or lease continuity."
                          : "Elementos que afectan ocupación, flujo de caja o continuidad del contrato."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {propertyOverview.attentionItems.length ? (
                        propertyOverview.attentionItems.map((item) => {
                          const toneClass =
                            item.tone === "danger"
                              ? "status-tone-danger"
                              : item.tone === "warning"
                                ? "status-tone-warning"
                                : "status-tone-info";
                          return (
                            <article
                              className="rounded-2xl border border-border/70 bg-background/72 p-3"
                              key={item.id}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <p className="font-medium text-sm">
                                    {item.title}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {item.detail}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px]",
                                    toneClass
                                  )}
                                >
                                  {item.tone === "danger"
                                    ? isEn
                                      ? "High"
                                      : "Alta"
                                    : item.tone === "warning"
                                      ? isEn
                                        ? "Medium"
                                        : "Media"
                                      : isEn
                                        ? "Info"
                                        : "Info"}
                                </span>
                              </div>
                              <Link
                                className={cn(
                                  buttonVariants({
                                    size: "sm",
                                    variant: "outline",
                                  }),
                                  "mt-2 h-7 px-2 text-xs"
                                )}
                                href={item.href}
                              >
                                {item.ctaLabel}
                              </Link>
                            </article>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-border/75 border-dashed bg-muted/20 p-4">
                          <p className="font-medium text-sm">
                            {isEn
                              ? "No urgent blockers right now."
                              : "No hay bloqueos urgentes por ahora."}
                          </p>
                          <p className="mt-1 text-muted-foreground text-sm">
                            {isEn
                              ? "Keep momentum by scheduling preventive checks."
                              : "Mantén el ritmo programando revisiones preventivas."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              className={cn(
                                buttonVariants({
                                  size: "sm",
                                  variant: "outline",
                                }),
                                "h-8 px-2.5"
                              )}
                              href={`/module/tasks?property_id=${encodeURIComponent(recordId)}`}
                            >
                              {isEn ? "Create task" : "Crear tarea"}
                            </Link>
                            <Link
                              className={cn(
                                buttonVariants({
                                  size: "sm",
                                  variant: "outline",
                                }),
                                "h-8 px-2.5"
                              )}
                              href={`/module/collections?property_id=${encodeURIComponent(recordId)}`}
                            >
                              {isEn ? "Review collections" : "Revisar cobros"}
                            </Link>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </div>
            </div>
          );
        })()
        : null}

      <Card>
        <CardHeader>
          <CardTitle>{isEn ? "Details" : "Detalles"}</CardTitle>
          <CardDescription>
            {isEn
              ? "Click related IDs to navigate."
              : "Haz clic en IDs relacionadas para navegar."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y rounded-md border">
            {keys.map((key) => {
              const value = record[key];

              const text = typeof value === "string" ? value : null;
              const dateLabel = text ? asDateLabel(text, formatLocale) : null;
              const isStatus =
                key === "status" &&
                typeof value === "string" &&
                value.trim().length > 0;

              const fkHref = (() => {
                const directBase = FOREIGN_KEY_HREF_BASE_BY_KEY[key];
                if (directBase && typeof value === "string" && isUuid(value)) {
                  return `${directBase}/${value}`;
                }

                if (key.endsWith("_name")) {
                  const idKey = `${key.slice(0, -5)}_id`;
                  const rawId = record[idKey];
                  const base = FOREIGN_KEY_HREF_BASE_BY_KEY[idKey];
                  if (base && typeof rawId === "string" && isUuid(rawId)) {
                    return `${base}/${rawId}`;
                  }
                }

                return null;
              })();

              const showMonospace =
                typeof value === "string" &&
                (isUuid(value) || key === "id" || key.endsWith("_id"));

              return (
                <div className="grid gap-2 p-4 md:grid-cols-12" key={key}>
                  <div className="md:col-span-4">
                    <p className="font-medium text-muted-foreground text-xs">
                      {humanizeKey(key)}
                    </p>
                  </div>
                  <div className="md:col-span-8">
                    {value === null || value === undefined ? (
                      <p className="text-muted-foreground text-sm">-</p>
                    ) : isStatus ? (
                      <StatusBadge value={String(value)} />
                    ) : dateLabel ? (
                      <p
                        className="text-foreground text-sm"
                        title={String(value)}
                      >
                        {dateLabel}
                      </p>
                    ) : fkHref ? (
                      <Link
                        className={cn(
                          "inline-flex items-center text-primary underline-offset-4 hover:underline",
                          key.endsWith("_name")
                            ? "text-sm"
                            : "font-mono text-xs",
                          showMonospace && !key.endsWith("_name")
                            ? "break-all"
                            : ""
                        )}
                        href={fkHref}
                        prefetch={false}
                        title={isEn ? `Open ${key}` : `Abrir ${key}`}
                      >
                        {key.endsWith("_name")
                          ? String(value)
                          : shortId(String(value))}
                      </Link>
                    ) : typeof value === "boolean" ? (
                      key === "is_active" ? (
                        <StatusBadge value={value ? "active" : "inactive"} />
                      ) : (
                        <p className="text-foreground text-sm">
                          {value ? (isEn ? "Yes" : "Sí") : isEn ? "No" : "No"}
                        </p>
                      )
                    ) : typeof value === "number" ? (
                      <p className="text-foreground text-sm tabular-nums">
                        {new Intl.NumberFormat(formatLocale, {
                          maximumFractionDigits: 2,
                        }).format(value)}
                      </p>
                    ) : typeof value === "object" ? (
                      <pre className="max-h-60 overflow-auto rounded-md border bg-muted/20 p-3 text-xs">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <p
                        className={cn(
                          "text-foreground text-sm",
                          showMonospace
                            ? "break-all font-mono text-xs"
                            : "break-words"
                        )}
                      >
                        {toLabel(value)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {moduleDef.slug === "organizations" ? (
        organizationMembersError ? (
          <Card>
            <CardHeader>
              <CardTitle>{isEn ? "Members" : "Miembros"}</CardTitle>
              <CardDescription>
                {isEn
                  ? "Could not load members for this organization."
                  : "No se pudieron cargar los miembros de esta organización."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground text-sm">
              <p className="break-words">{organizationMembersError}</p>
            </CardContent>
          </Card>
        ) : (
          <OrgMembersCard
            canManage={canManageMembers}
            currentUserId={sessionUserId}
            members={organizationMembers}
            organizationId={recordId}
            ownerUserId={ownerUserId}
          />
        )
      ) : null}

      {moduleDef.slug === "organizations" && canManageMembers ? (
        organizationInvitesError ? (
          <Card>
            <CardHeader>
              <CardTitle>{isEn ? "Invites" : "Invitaciones"}</CardTitle>
              <CardDescription>
                {isEn
                  ? "Could not load invites for this organization."
                  : "No se pudieron cargar las invitaciones de esta organización."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground text-sm">
              <p className="break-words">{organizationInvitesError}</p>
            </CardContent>
          </Card>
        ) : (
          <OrgInvitesCard
            canManage={canManageMembers}
            invites={organizationInvites}
            organizationId={recordId}
          />
        )
      ) : null}

      {relatedLinks.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{isEn ? "Related" : "Relacionado"}</CardTitle>
            <CardDescription>
              {isEn
                ? "Jump directly to linked workflows."
                : "Salta directamente a flujos vinculados."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <Link
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "max-w-full"
                )}
                href={link.href}
                key={link.href}
                prefetch={false}
              >
                {link.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
