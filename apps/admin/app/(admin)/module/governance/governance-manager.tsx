"use client";

import { useState } from "react";
import { PiiAuditLog } from "./pii-audit-log";
import { MemoryGovernance } from "./memory-governance";
import { FailSafeBoundaries } from "./fail-safe-boundaries";
import { SecurityAudit } from "./security-audit";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

type GovernanceManagerProps = {
  orgId: string;
  locale: Locale;
};

const TABS = [
  { key: "pii", labelEn: "PII Audit Log", labelEs: "Registro de PII" },
  { key: "memory", labelEn: "Memory Governance", labelEs: "Gobernanza de Memoria" },
  { key: "boundaries", labelEn: "Fail-Safe Boundaries", labelEs: "Limites de Seguridad" },
  { key: "security", labelEn: "Security Audit", labelEs: "Auditoría de Seguridad" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function GovernanceManager({
  orgId,
  locale,
}: GovernanceManagerProps) {
  const isEn = locale === "en-US";
  const [activeTab, setActiveTab] = useState<TabKey>("pii");

  return (
    <div className="space-y-5">
      <header className="glass-surface rounded-3xl p-5">
        <h1 className="font-semibold text-2xl">
          {isEn ? "Governance Center" : "Centro de Gobernanza"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground/90">
          {isEn
            ? "Monitor AI compliance, manage agent memory, and configure safety boundaries."
            : "Monitorea el cumplimiento de IA, gestiona la memoria del agente y configura los limites de seguridad."}
        </p>
      </header>

      <div className="inline-flex items-center gap-0.5 rounded-xl bg-muted/40 p-1 ring-1 ring-border/20 ring-inset">
        {TABS.map((tab) => (
          <button
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 font-medium text-sm transition-all duration-200",
              activeTab === tab.key
                ? "bg-white/60 text-foreground shadow-sm ring-1 ring-white/50 ring-inset dark:bg-white/10 dark:ring-white/[0.08]"
                : "text-muted-foreground hover:bg-white/30 hover:text-foreground/80 dark:hover:bg-white/[0.06]"
            )}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {isEn ? tab.labelEn : tab.labelEs}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === "pii" ? (
          <PiiAuditLog isEn={isEn} orgId={orgId} />
        ) : activeTab === "memory" ? (
          <MemoryGovernance isEn={isEn} orgId={orgId} />
        ) : activeTab === "boundaries" ? (
          <FailSafeBoundaries isEn={isEn} orgId={orgId} />
        ) : (
          <SecurityAudit isEn={isEn} orgId={orgId} />
        )}
      </div>
    </div>
  );
}
