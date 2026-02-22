"use client";

import {
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  Database02Icon,
  MailSend01Icon,
  MessageSearch01Icon,
  Settings02Icon,
  SparklesIcon,
  TestTube01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { authedFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import type { AgentRow } from "./agent-config-types";

/* ── Tool categories ── */

type ToolCategory = {
  key: string;
  labelEn: string;
  labelEs: string;
  icon: IconSvgElement;
  tools: string[];
};

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    key: "data-access",
    labelEn: "Data Access",
    labelEs: "Acceso a Datos",
    icon: Database02Icon,
    tools: ["list_tables", "get_org_snapshot", "list_rows", "get_row"],
  },
  {
    key: "data-mutation",
    labelEn: "Data Mutation",
    labelEs: "Mutación de Datos",
    icon: Wrench01Icon,
    tools: ["create_row", "update_row", "delete_row"],
  },
  {
    key: "operations",
    labelEn: "Operations",
    labelEs: "Operaciones",
    icon: Settings02Icon,
    tools: [
      "get_today_ops_brief",
      "get_staff_availability",
      "create_maintenance_task",
      "delegate_to_agent",
    ],
  },
  {
    key: "analytics",
    labelEn: "Analytics",
    labelEs: "Analítica",
    icon: SparklesIcon,
    tools: [
      "get_occupancy_forecast",
      "get_anomaly_alerts",
      "get_lease_risk_summary",
      "get_revenue_analytics",
      "get_seasonal_demand",
    ],
  },
  {
    key: "finance",
    labelEn: "Finance",
    labelEs: "Finanzas",
    icon: CheckmarkCircle02Icon,
    tools: [
      "get_collections_risk",
      "get_owner_statement_summary",
      "generate_owner_statement",
      "reconcile_collections",
      "categorize_expense",
    ],
  },
  {
    key: "communication",
    labelEn: "Communication",
    labelEs: "Comunicación",
    icon: MailSend01Icon,
    tools: ["send_message", "search_knowledge"],
  },
  {
    key: "memory",
    labelEn: "Memory",
    labelEs: "Memoria",
    icon: MessageSearch01Icon,
    tools: ["recall_memory", "store_memory"],
  },
];

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((c) => c.tools);

/* ── Types ── */

type AgentDetail = AgentRow & {
  system_prompt?: string | null;
  allowed_tools: string[];
};

type Props = {
  orgId: string;
  initialAgents: AgentRow[];
  locale: string;
};

/* ── Component ── */

export function AgentConfigManager({ orgId, initialAgents, locale }: Props) {
  const isEn = locale === "en-US";
  const [agents, setAgents] = useState<AgentRow[]>(initialAgents);
  const [selected, setSelected] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(false);

  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const selectAgent = useCallback(
    async (slug: string) => {
      setLoading(true);
      setTestResult("");
      setTestInput("");
      try {
        const detail = await authedFetch<AgentDetail>(
          `/ai-agents/${slug}?org_id=${orgId}`
        );
        setSelected(detail);
        setPrompt(detail.system_prompt ?? "");
        setEnabledTools(new Set(detail.allowed_tools ?? []));
        setIsActive(detail.is_active);
      } catch {
        toast.error("Failed to load agent details");
      } finally {
        setLoading(false);
      }
    },
    [orgId]
  );

  const handleSave = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await authedFetch(`/ai-agents/${selected.slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          org_id: orgId,
          system_prompt: prompt,
          allowed_tools: Array.from(enabledTools),
          is_active: isActive,
        }),
      });
      setAgents((prev) =>
        prev.map((a) =>
          a.slug === selected.slug ? { ...a, is_active: isActive } : a
        )
      );
      toast.success(isEn ? "Changes saved" : "Cambios guardados");
    } catch {
      toast.error("Failed to save agent configuration");
    } finally {
      setSaving(false);
    }
  }, [selected, orgId, prompt, enabledTools, isActive, isEn]);

  const toggleTool = useCallback((tool: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  }, []);

  const toggleCategory = useCallback(
    (category: ToolCategory) => {
      const allEnabled = category.tools.every((t) => enabledTools.has(t));
      setEnabledTools((prev) => {
        const next = new Set(prev);
        for (const tool of category.tools) {
          if (allEnabled) next.delete(tool);
          else next.add(tool);
        }
        return next;
      });
    },
    [enabledTools]
  );

  const toggleCollapse = useCallback((key: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleTest = useCallback(async () => {
    if (!(selected && testInput.trim())) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await authedFetch<{ reply?: string; content?: string }>(
        "/agent/chats",
        {
          method: "POST",
          body: JSON.stringify({
            org_id: orgId,
            agent_slug: selected.slug,
            title: `Test: ${testInput.slice(0, 40)}`,
          }),
        }
      );
      const chatId = (res as Record<string, unknown>).id as string;
      if (chatId) {
        const msgRes = await authedFetch<{
          assistant_message?: { content?: string };
        }>(`/agent/chats/${chatId}/messages?org_id=${orgId}`, {
          method: "POST",
          body: JSON.stringify({ message: testInput }),
        });
        setTestResult(
          msgRes.assistant_message?.content ?? JSON.stringify(msgRes, null, 2)
        );
      }
    } catch (err) {
      setTestResult(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setTesting(false);
    }
  }, [selected, orgId, testInput]);

  const formatToolName = (tool: string) =>
    tool.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex gap-6">
      {/* Agent list — left panel */}
      <div className="w-64 shrink-0 space-y-1">
        <p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-[0.15em]">
          {isEn ? "Agents" : "Agentes"}
        </p>
        {agents.map((agent) => (
          <button
            className={cn(
              "w-full rounded-md px-3 py-2 text-left transition-colors",
              selected?.slug === agent.slug
                ? "bg-muted/60 text-foreground"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
            key={agent.slug}
            onClick={() => selectAgent(agent.slug)}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  agent.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
                )}
              />
              <span className="truncate font-medium text-sm">{agent.name}</span>
            </div>
            <p className="mt-0.5 ml-[18px] truncate text-muted-foreground text-xs">
              {agent.description}
            </p>
          </button>
        ))}
        {agents.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              {isEn ? "No agents configured." : "No hay agentes configurados."}
            </p>
          </div>
        )}
      </div>

      {/* Detail panel — right */}
      <div className="min-w-0 flex-1">
        {!(selected || loading) && (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              {isEn
                ? "Select an agent to configure."
                : "Seleccione un agente para configurar."}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex h-64 items-center justify-center">
            <p className="animate-pulse text-muted-foreground text-sm">
              {isEn ? "Loading..." : "Cargando..."}
            </p>
          </div>
        )}

        {selected && !loading && (
          <div className="space-y-5">
            {/* Header section */}
            <div className="flex items-center justify-between gap-4 border-border/50 border-b pb-4">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-base">
                  {selected.name}
                </h3>
                <p className="text-muted-foreground text-xs">
                  {selected.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-muted-foreground">
                    {isActive
                      ? isEn
                        ? "Active"
                        : "Activo"
                      : isEn
                        ? "Inactive"
                        : "Inactivo"}
                  </span>
                </label>
                <Button
                  className="h-8 w-8 p-0"
                  onClick={() => setTestOpen((v) => !v)}
                  size="sm"
                  title={isEn ? "Test Agent" : "Probar Agente"}
                  variant="ghost"
                >
                  <Icon
                    className={cn(
                      "text-muted-foreground",
                      testOpen && "text-foreground"
                    )}
                    icon={TestTube01Icon}
                    size={16}
                  />
                </Button>
                <Button disabled={saving} onClick={handleSave} size="sm">
                  {saving
                    ? isEn
                      ? "Saving..."
                      : "Guardando..."
                    : isEn
                      ? "Save"
                      : "Guardar"}
                </Button>
              </div>
            </div>

            {/* System prompt */}
            <div className="space-y-2">
              <label className="block font-medium text-sm">
                {isEn ? "System Prompt" : "Prompt del Sistema"}
              </label>
              <Textarea
                className="resize-y font-mono text-[13px]"
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  isEn
                    ? "Enter system instructions for this agent..."
                    : "Ingresa las instrucciones del sistema para este agente..."
                }
                rows={10}
                value={prompt}
              />
              <div className="flex justify-end">
                <Badge className="text-[10px] tabular-nums" variant="secondary">
                  {prompt.length.toLocaleString()}{" "}
                  {isEn ? "characters" : "caracteres"}
                </Badge>
              </div>
            </div>

            {/* Tools — categorized */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-medium text-sm">
                  {isEn ? "Allowed Tools" : "Herramientas Permitidas"}
                </label>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] tabular-nums" variant="outline">
                    {enabledTools.size}/{ALL_TOOLS.length}
                  </Badge>
                  <Button
                    className="h-7 text-xs"
                    onClick={() => setEnabledTools(new Set(ALL_TOOLS))}
                    size="sm"
                    variant="ghost"
                  >
                    {isEn ? "All" : "Todo"}
                  </Button>
                  <Button
                    className="h-7 text-xs"
                    onClick={() => setEnabledTools(new Set())}
                    size="sm"
                    variant="ghost"
                  >
                    {isEn ? "None" : "Ninguno"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {TOOL_CATEGORIES.map((cat) => {
                  const enabledCount = cat.tools.filter((t) =>
                    enabledTools.has(t)
                  ).length;
                  const allEnabled = enabledCount === cat.tools.length;
                  const isCollapsed = collapsedCategories.has(cat.key);

                  return (
                    <div
                      className="border-border/40 border-b last:border-b-0"
                      key={cat.key}
                    >
                      <button
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                        onClick={() => toggleCollapse(cat.key)}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className="text-muted-foreground"
                            icon={cat.icon}
                            size={14}
                          />
                          <span className="font-medium text-sm">
                            {isEn ? cat.labelEn : cat.labelEs}
                          </span>
                          <Badge
                            className="text-[10px] tabular-nums"
                            variant={allEnabled ? "default" : "secondary"}
                          >
                            {enabledCount}/{cat.tools.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(cat);
                            }}
                            type="button"
                          >
                            {allEnabled
                              ? isEn
                                ? "Deselect all"
                                : "Quitar todo"
                              : isEn
                                ? "Select all"
                                : "Seleccionar todo"}
                          </button>
                          <Icon
                            className={cn(
                              "text-muted-foreground transition-transform",
                              isCollapsed ? "-rotate-90" : "rotate-0"
                            )}
                            icon={ArrowDown01Icon}
                            size={12}
                          />
                        </div>
                      </button>
                      {!isCollapsed && (
                        <div className="grid gap-1.5 px-3 pb-2.5 sm:grid-cols-2">
                          {cat.tools.map((tool) => (
                            <label
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/30"
                              key={tool}
                            >
                              <Checkbox
                                checked={enabledTools.has(tool)}
                                onCheckedChange={() => toggleTool(tool)}
                              />
                              <span className="text-[13px]">
                                {formatToolName(tool)}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Test panel — progressive disclosure */}
            {testOpen && (
              <div className="space-y-3 border-border/50 border-t pt-4">
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) handleTest();
                    }}
                    placeholder={
                      isEn
                        ? "Type a test message..."
                        : "Escribe un mensaje de prueba..."
                    }
                    value={testInput}
                  />
                  <Button
                    disabled={testing || !testInput.trim()}
                    onClick={handleTest}
                    size="sm"
                  >
                    {testing
                      ? isEn
                        ? "Running..."
                        : "Ejecutando..."
                      : isEn
                        ? "Send"
                        : "Enviar"}
                  </Button>
                </div>
                {testResult && (
                  <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                    {testResult}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
