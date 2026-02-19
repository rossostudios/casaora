"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createOrganizationInviteAction,
  revokeOrganizationInviteAction,
} from "@/app/(admin)/actions/organization-invites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type MemberRole =
  | "owner_admin"
  | "operator"
  | "cleaner"
  | "accountant"
  | "viewer";

type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type OrgInviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: MemberRole | string;
  token: string;
  status: InviteStatus | string;
  expires_at?: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
};

const ROLE_LABEL: Record<MemberRole, string> = {
  owner_admin: "Administrador",
  operator: "Operaciones",
  cleaner: "Limpieza",
  accountant: "Finanzas",
  viewer: "Solo lectura",
};

const ROLE_OPTIONS: Array<{ value: MemberRole; label: string }> = [
  { value: "owner_admin", label: ROLE_LABEL.owner_admin },
  { value: "operator", label: ROLE_LABEL.operator },
  { value: "cleaner", label: ROLE_LABEL.cleaner },
  { value: "accountant", label: ROLE_LABEL.accountant },
  { value: "viewer", label: ROLE_LABEL.viewer },
];

const STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  revoked: "Revocada",
  expired: "Expirada",
};

function normalizeRole(value: string): MemberRole | null {
  const trimmed = value.trim() as MemberRole;
  return ROLE_LABEL[trimmed] ? trimmed : null;
}

function normalizeStatus(value: string): InviteStatus | null {
  const trimmed = value.trim() as InviteStatus;
  return STATUS_LABEL[trimmed] ? trimmed : null;
}

function shortToken(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusBadgeVariant(status: InviteStatus): "secondary" | "outline" {
  return status === "pending" ? "secondary" : "outline";
}

export function OrgInvitesCard({
  organizationId,
  canManage,
  invites,
}: {
  organizationId: string;
  canManage: boolean;
  invites: OrgInviteRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("operator");

  const sorted = useMemo(() => {
    const copy = [...invites];
    const score = (value: string): number => {
      const normalized = normalizeStatus(value);
      if (normalized === "pending") return 0;
      if (normalized === "accepted") return 1;
      if (normalized === "expired") return 2;
      if (normalized === "revoked") return 3;
      return 10;
    };
    copy.sort((a, b) => {
      const aScore = score(String(a.status ?? ""));
      const bScore = score(String(b.status ?? ""));
      if (aScore !== bScore) return aScore - bScore;
      return String(b.created_at ?? "").localeCompare(
        String(a.created_at ?? "")
      );
    });
    return copy;
  }, [invites]);

  const createInvite = () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      toast.error("Email obligatorio");
      return;
    }

    startTransition(async () => {
      const result = await createOrganizationInviteAction({
        organizationId,
        email: nextEmail,
        role,
      });
      if (!result.ok) {
        toast.error("No se pudo crear la invitación", {
          description: result.error,
        });
        return;
      }
      toast.success("Invitación creada");
      setEmail("");
    });
  };

  const copyInviteLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = origin ? `${origin}/invite/${token}` : token;
    navigator.clipboard
      .writeText(url)
      .then(() =>
        toast.success("Link copiado", { description: shortToken(url) })
      )
      .catch(() =>
        toast.error("No se pudo copiar", {
          description: "Tu navegador bloqueó el acceso al portapapeles.",
        })
      );
  };

  const revokeInvite = (inviteId: string) => {
    toast("Confirmar revocación", {
      description: "¿Revocar esta invitación pendiente?",
      action: {
        label: "Revocar",
        onClick: () => {
          startTransition(async () => {
            const result = await revokeOrganizationInviteAction({
              organizationId,
              inviteId,
            });
            if (!result.ok) {
              toast.error("No se pudo revocar", { description: result.error });
              return;
            }
            toast.success("Invitación revocada");
          });
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Invitaciones</CardTitle>
            <CardDescription>
              Invita usuarios por email. Comparte el link de invitación para que
              se unan y se asigne el rol automáticamente.
            </CardDescription>
          </div>
          <Badge variant="secondary">{sorted.length}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {canManage ? (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="block flex-1" htmlFor="invite-email">
                <span className="mb-1 block font-medium text-muted-foreground text-xs">
                  Email
                </span>
                <Input
                  autoComplete="email"
                  id="invite-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@correo.com"
                  type="email"
                  value={email}
                />
              </label>
              <label className="block md:w-56" htmlFor="invite-role">
                <span className="mb-1 block font-medium text-muted-foreground text-xs">
                  Rol
                </span>
                <Select
                  id="invite-role"
                  onChange={(event) => {
                    const next = normalizeRole(event.target.value);
                    if (next) setRole(next);
                  }}
                  value={role}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <Button disabled={pending} onClick={createInvite} type="button">
                Crear invitación
              </Button>
            </div>
            <p className="mt-2 text-muted-foreground text-xs">
              Las invitaciones vencen automáticamente. Puedes revocar una
              invitación pendiente en cualquier momento.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/10 p-4 text-muted-foreground text-sm">
            Solo los administradores pueden crear o revocar invitaciones.
          </div>
        )}

        <div className="overflow-hidden rounded-lg border">
          {sorted.length ? (
            <div className="divide-y">
              {sorted.map((invite) => {
                const status =
                  normalizeStatus(String(invite.status ?? "")) ?? "pending";
                const createdAt = formatDate(invite.created_at ?? null);
                const expiresAt = formatDate(invite.expires_at ?? null);
                const acceptedAt = formatDate(invite.accepted_at ?? null);
                const revokedAt = formatDate(invite.revoked_at ?? null);
                const roleLabel =
                  normalizeRole(String(invite.role ?? "")) ??
                  ("viewer" as MemberRole);

                return (
                  <div
                    className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                    key={invite.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-sm">
                          {invite.email}
                        </p>
                        <Badge variant={statusBadgeVariant(status)}>
                          {STATUS_LABEL[status]}
                        </Badge>
                        <Badge variant="outline">
                          {ROLE_LABEL[roleLabel] ?? String(invite.role ?? "-")}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                        <span className="font-mono" title={invite.token}>
                          {shortToken(invite.token)}
                        </span>
                        {createdAt ? <span>Creada: {createdAt}</span> : null}
                        {expiresAt ? (
                          <span className="text-muted-foreground">
                            Vence: {expiresAt}
                          </span>
                        ) : null}
                        {acceptedAt ? (
                          <span>Aceptada: {acceptedAt}</span>
                        ) : null}
                        {revokedAt ? <span>Revocada: {revokedAt}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <CopyButton
                        className="h-9"
                        label="Copiar token"
                        value={invite.token}
                      />
                      <Button
                        onClick={() => copyInviteLink(invite.token)}
                        type="button"
                        variant="outline"
                      >
                        Copiar link
                      </Button>
                      {canManage && status === "pending" ? (
                        <Button
                          disabled={pending}
                          onClick={() => revokeInvite(invite.id)}
                          type="button"
                          variant="outline"
                        >
                          Revocar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              description="Crea una invitación para que tu equipo se una a esta organización."
              title="Aún no hay invitaciones"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
