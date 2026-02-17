"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useActiveLocale } from "@/lib/i18n/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

function asString(value: unknown): string {
  return typeof value === "string" ? value : value ? String(value) : "";
}

type TemplateRow = {
  id: string;
  name: string;
  language: string;
  body_template: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
};

function parseTemplate(raw: Record<string, unknown>): TemplateRow {
  const variables = raw.variables;
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    language: asString(raw.language) || "es",
    body_template: asString(raw.body_template),
    variables: Array.isArray(variables)
      ? variables.map(String)
      : [],
    is_default: Boolean(raw.is_default),
    created_at: asString(raw.created_at),
  };
}

const AVAILABLE_VARIABLES = [
  "tenant_full_name",
  "tenant_email",
  "tenant_phone_e164",
  "starts_on",
  "ends_on",
  "monthly_rent",
  "service_fee_flat",
  "security_deposit",
  "guarantee_option_fee",
  "tax_iva",
  "currency",
  "property_name",
  "property_address",
  "property_city",
  "unit_name",
  "org_name",
  "today",
];

export function ContractTemplatesSection({
  orgId,
}: {
  orgId: string;
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("es");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/contract-templates?org_id=${encodeURIComponent(orgId)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        const items = ((data as { data?: unknown[] }).data ?? []) as Record<
          string,
          unknown
        >[];
        setTemplates(items.map(parseTemplate));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) ?? [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
  };

  const resetForm = () => {
    setName("");
    setLanguage("es");
    setBodyTemplate("");
    setIsDefault(false);
    setEditingId(null);
  };

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setBusy(true);

    try {
      const vars = extractVariables(bodyTemplate);
      const url = editingId
        ? `${API_BASE}/contract-templates/${encodeURIComponent(editingId)}`
        : `${API_BASE}/contract-templates`;
      const method = editingId ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        name: name.trim(),
        language,
        body_template: bodyTemplate,
        variables: vars,
        is_default: isDefault,
      };
      if (!editingId) {
        body.organization_id = orgId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(
          asString((data as Record<string, unknown>).message) ||
            (isEn ? "Failed to save template" : "Error al guardar la plantilla")
        );
        return;
      }

      toast.success(
        editingId
          ? isEn
            ? "Template updated"
            : "Plantilla actualizada"
          : isEn
            ? "Template created"
            : "Plantilla creada"
      );
      setSheetOpen(false);
      resetForm();
      fetchTemplates();
    } catch {
      toast.error(isEn ? "Network error" : "Error de red");
    } finally {
      setBusy(false);
    }
  }, [name, language, bodyTemplate, isDefault, orgId, editingId, isEn, fetchTemplates]);

  const handleDelete = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        const res = await fetch(
          `${API_BASE}/contract-templates/${encodeURIComponent(id)}`,
          { method: "DELETE", credentials: "include" }
        );
        if (res.ok || res.status === 204) {
          toast.success(
            isEn ? "Template deleted" : "Plantilla eliminada"
          );
          setTemplates((prev) => prev.filter((t) => t.id !== id));
        }
      } catch {
        toast.error(isEn ? "Delete failed" : "Error al eliminar");
      } finally {
        setBusy(false);
      }
    },
    [isEn]
  );

  const handleEdit = (t: TemplateRow) => {
    setEditingId(t.id);
    setName(t.name);
    setLanguage(t.language);
    setBodyTemplate(t.body_template);
    setIsDefault(t.is_default);
    setSheetOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {isEn ? "Contract Templates" : "Plantillas de Contrato"}
          </CardTitle>
          <Button
            onClick={() => {
              resetForm();
              setSheetOpen(true);
            }}
            size="sm"
          >
            {isEn ? "New Template" : "Nueva Plantilla"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">
            {isEn ? "Loading..." : "Cargando..."}
          </p>
        ) : templates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {isEn
              ? "No templates yet. Create one to generate contracts from lease data."
              : "Aún no hay plantillas. Crea una para generar contratos desde datos de contratos."}
          </p>
        ) : (
          templates.map((t) => (
            <div
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              key={t.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.language === "es" ? "Español" : "English"} ·{" "}
                  {t.variables.length} {isEn ? "variables" : "variables"}
                  {t.is_default ? (
                    <>
                      {" · "}
                      <StatusBadge
                        label={isEn ? "default" : "predeterminada"}
                        tone="success"
                        value="default"
                      />
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  onClick={() => handleEdit(t)}
                  size="sm"
                  variant="ghost"
                >
                  {isEn ? "Edit" : "Editar"}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => handleDelete(t.id)}
                  size="sm"
                  variant="ghost"
                >
                  {isEn ? "Delete" : "Eliminar"}
                </Button>
              </div>
            </div>
          ))
        )}

        {/* Create/Edit Sheet */}
        <Sheet
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) resetForm();
          }}
          open={sheetOpen}
          title={
            editingId
              ? isEn
                ? "Edit Template"
                : "Editar Plantilla"
              : isEn
                ? "New Contract Template"
                : "Nueva Plantilla de Contrato"
          }
          description={
            isEn
              ? "Use {{variable}} placeholders that will be replaced with lease data."
              : "Usa {{variable}} como marcadores que se reemplazarán con datos del contrato."
          }
        >
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">
                {isEn ? "Template name" : "Nombre de la plantilla"}
              </span>
              <Input
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  isEn
                    ? "e.g. Standard Lease Agreement"
                    : "ej. Contrato de Alquiler Estándar"
                }
                value={name}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">
                {isEn ? "Language" : "Idioma"}
              </span>
              <Select
                onChange={(e) => setLanguage(e.target.value)}
                value={language}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </Select>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">
                {isEn ? "Template body" : "Cuerpo de la plantilla"}
              </span>
              <Textarea
                className="font-mono text-xs"
                onChange={(e) => setBodyTemplate(e.target.value)}
                placeholder={
                  isEn
                    ? "CONTRATO DE ARRENDAMIENTO\n\nEntre {{org_name}} y {{tenant_full_name}}..."
                    : "CONTRATO DE ARRENDAMIENTO\n\nEntre {{org_name}} y {{tenant_full_name}}..."
                }
                rows={12}
                value={bodyTemplate}
              />
            </label>

            {/* Variables preview */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {isEn ? "Available variables:" : "Variables disponibles:"}
              </p>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] hover:bg-muted/80"
                    key={v}
                    onClick={() =>
                      setBodyTemplate((prev) => `${prev}{{${v}}}`)
                    }
                    type="button"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Detected variables */}
            {bodyTemplate ? (
              <div className="text-xs text-muted-foreground">
                {isEn ? "Detected:" : "Detectadas:"}{" "}
                {extractVariables(bodyTemplate).join(", ") || (isEn ? "none" : "ninguna")}
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input
                checked={isDefault}
                className="h-4 w-4 rounded border"
                onChange={(e) => setIsDefault(e.target.checked)}
                type="checkbox"
              />
              <span>
                {isEn ? "Set as default template" : "Establecer como plantilla predeterminada"}
              </span>
            </label>

            <Button
              className="w-full"
              disabled={busy || !name.trim()}
              onClick={handleCreate}
            >
              {busy
                ? isEn
                  ? "Saving..."
                  : "Guardando..."
                : editingId
                  ? isEn
                    ? "Update Template"
                    : "Actualizar Plantilla"
                  : isEn
                    ? "Create Template"
                    : "Crear Plantilla"}
            </Button>
          </div>
        </Sheet>
      </CardContent>
    </Card>
  );
}
