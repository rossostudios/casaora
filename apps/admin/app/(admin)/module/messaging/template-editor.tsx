"use client";

import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";

import {
  createTemplateAction,
  deleteTemplateAction,
} from "@/app/(admin)/module/messaging/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { MessageTemplate } from "@/lib/features/messaging/types";
import { useActiveLocale } from "@/lib/i18n/client";

const CHANNELS = ["whatsapp", "email", "sms"] as const;

function channelColor(ch: string) {
  if (ch === "whatsapp") return "border-emerald-200/60 bg-emerald-50/60 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (ch === "sms") return "border-amber-200/60 bg-amber-50/60 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400";
  return "border-blue-200/60 bg-blue-50/60 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400";
}

export function TemplateEditor({
  templates,
  orgId,
}: {
  templates: MessageTemplate[];
  orgId: string;
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.channel.toLowerCase().includes(q)
    );
  }, [templates, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="max-w-xs"
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEn ? "Search templates..." : "Buscar plantillas..."}
          value={search}
        />
        <Button onClick={() => setOpen(true)} type="button" variant="secondary">
          <Icon icon={PlusSignIcon} size={16} />
          {isEn ? "New template" : "Nueva plantilla"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {isEn
              ? "No message templates yet. Create one to use in conversations."
              : "Aún no hay plantillas. Crea una para usar en conversaciones."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => (
            <div
              className="group relative rounded-xl border bg-background/60 p-4 transition-colors hover:border-primary/30"
              key={tpl.id}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{tpl.name}</p>
                <Badge
                  className={`shrink-0 border px-1.5 py-px text-[10px] font-semibold ${channelColor(tpl.channel)}`}
                  variant="outline"
                >
                  {tpl.channel}
                </Badge>
              </div>
              {tpl.subject ? (
                <p className="mb-1 truncate text-xs text-muted-foreground">
                  {isEn ? "Subject:" : "Asunto:"} {tpl.subject}
                </p>
              ) : null}
              <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {tpl.body}
              </p>

              {/* Variables preview */}
              {tpl.body.includes("{{") ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from(tpl.body.matchAll(/\{\{(\w+)\}\}/g)).map(
                    (m, i) => (
                      <Badge
                        className="px-1.5 py-0 text-[10px]"
                        key={`${m[1]}-${i}`}
                        variant="secondary"
                      >
                        {`{{${m[1]}}}`}
                      </Badge>
                    )
                  )}
                </div>
              ) : null}

              <div className="mt-3 flex justify-end">
                <Form action={deleteTemplateAction}>
                  <input name="template_id" type="hidden" value={tpl.id} />
                  <Button
                    className="gap-1 opacity-0 group-hover:opacity-100"
                    size="sm"
                    type="submit"
                    variant="ghost"
                  >
                    <Icon icon={Delete02Icon} size={14} />
                    {isEn ? "Delete" : "Eliminar"}
                  </Button>
                </Form>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet
        contentClassName="max-w-lg"
        description={
          isEn
            ? "Create a reusable message template. Use {{variable}} for dynamic placeholders."
            : "Crea una plantilla de mensaje reutilizable. Usa {{variable}} para marcadores dinámicos."
        }
        onOpenChange={setOpen}
        open={open}
        title={isEn ? "New template" : "Nueva plantilla"}
      >
        <Form action={createTemplateAction} className="space-y-4">
          <input name="organization_id" type="hidden" value={orgId} />

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-muted-foreground">
              {isEn ? "Template name" : "Nombre de plantilla"}
            </span>
            <Input name="name" required placeholder={isEn ? "e.g. Check-in reminder" : "ej. Recordatorio de check-in"} />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-muted-foreground">
              {isEn ? "Channel" : "Canal"}
            </span>
            <Select defaultValue="whatsapp" name="channel">
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </Select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-muted-foreground">
              {isEn ? "Subject (email only)" : "Asunto (solo email)"}
            </span>
            <Input name="subject" placeholder={isEn ? "Optional" : "Opcional"} />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-muted-foreground">
              {isEn ? "Body" : "Contenido"}
            </span>
            <Textarea
              name="body"
              placeholder={
                isEn
                  ? "Hello {{guest_name}}, your check-in is on {{check_in_date}}."
                  : "Hola {{guest_name}}, tu check-in es el {{check_in_date}}."
              }
              required
              rows={6}
            />
            <p className="text-[11px] text-muted-foreground/60">
              {isEn
                ? "Use {{variable_name}} for dynamic placeholders."
                : "Usa {{nombre_variable}} para marcadores dinámicos."}
            </p>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-muted-foreground">
              {isEn ? "Language" : "Idioma"}
            </span>
            <Select defaultValue="es-PY" name="language_code">
              <option value="es-PY">Español (PY)</option>
              <option value="en-US">English (US)</option>
            </Select>
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              {isEn ? "Cancel" : "Cancelar"}
            </Button>
            <Button type="submit" variant="secondary">
              {isEn ? "Create template" : "Crear plantilla"}
            </Button>
          </div>
        </Form>
      </Sheet>
    </div>
  );
}
