"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";

type SlaRule = {
  id: string;
  urgency: string;
  response_hours: number;
  resolution_hours: number;
  auto_escalate: boolean;
  escalation_notify_channel: string | null;
  escalation_target: string | null;
};

type Props = {
  slaRules: Record<string, unknown>[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function bool(v: unknown): boolean {
  return v === true;
}

function urgencyColor(u: string): string {
  switch (u) {
    case "critical":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "high":
      return "bg-orange-500/10 text-orange-600 border-orange-200";
    case "medium":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    case "low":
      return "bg-green-500/10 text-green-600 border-green-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  const remaining = h % 24;
  return remaining > 0 ? `${days}d ${remaining}h` : `${days}d`;
}

// Default SLA rules when no custom rules configured
const DEFAULT_RULES: SlaRule[] = [
  {
    id: "default-critical",
    urgency: "critical",
    response_hours: 1,
    resolution_hours: 4,
    auto_escalate: true,
    escalation_notify_channel: "whatsapp",
    escalation_target: null,
  },
  {
    id: "default-high",
    urgency: "high",
    response_hours: 4,
    resolution_hours: 24,
    auto_escalate: true,
    escalation_notify_channel: "in_app",
    escalation_target: null,
  },
  {
    id: "default-medium",
    urgency: "medium",
    response_hours: 24,
    resolution_hours: 72,
    auto_escalate: false,
    escalation_notify_channel: null,
    escalation_target: null,
  },
  {
    id: "default-low",
    urgency: "low",
    response_hours: 48,
    resolution_hours: 168,
    auto_escalate: false,
    escalation_notify_channel: null,
    escalation_target: null,
  },
];

export function SlaConfig({ slaRules: raw }: Props) {
  const rules: SlaRule[] = useMemo(() => {
    if (raw.length === 0) return DEFAULT_RULES;
    return raw.map((r) => ({
      id: str(r.id),
      urgency: str(r.urgency) || str(r.priority) || "medium",
      response_hours: num(r.response_hours),
      resolution_hours: num(r.resolution_hours),
      auto_escalate: bool(r.auto_escalate),
      escalation_notify_channel: str(r.escalation_notify_channel) || null,
      escalation_target: str(r.escalation_target) || null,
    }));
  }, [raw]);

  const urgencyOrder = ["critical", "high", "medium", "low"];
  const sorted = [...rules].sort(
    (a, b) => urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency)
  );

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        SLA rules define response and resolution deadlines per urgency level.
        Auto-escalation triggers when deadlines are breached.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground text-xs">
              <th className="pr-4 pb-2 font-medium">Urgency</th>
              <th className="pr-4 pb-2 font-medium">Response</th>
              <th className="pr-4 pb-2 font-medium">Resolution</th>
              <th className="pr-4 pb-2 font-medium">Auto-Escalate</th>
              <th className="pr-4 pb-2 font-medium">Channel</th>
              <th className="pb-2 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((rule) => (
              <tr className="border-b last:border-0" key={rule.id}>
                <td className="py-2.5 pr-4">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[11px] ${urgencyColor(rule.urgency)}`}
                  >
                    {rule.urgency}
                  </span>
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs">
                  {formatHours(rule.response_hours)}
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs">
                  {formatHours(rule.resolution_hours)}
                </td>
                <td className="py-2.5 pr-4">
                  {rule.auto_escalate ? (
                    <Badge className="text-[10px]" variant="secondary">
                      On
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Off</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                  {rule.escalation_notify_channel ?? "—"}
                </td>
                <td className="py-2.5 text-muted-foreground text-xs">
                  {rule.escalation_target ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {raw.length === 0 ? (
        <p className="text-muted-foreground text-xs italic">
          Showing default SLA rules. Configure custom rules via the data table
          to override.
        </p>
      ) : null}
    </div>
  );
}
