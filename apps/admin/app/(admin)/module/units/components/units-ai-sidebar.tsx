"use client";

import { motion } from "motion/react";
import Link from "next/link";

const EASING = [0.22, 1, 0.36, 1] as const;

const STAGGER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
} as const;

const FADE_VARIANT = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: EASING },
  },
} as const;

const AMBIENT_EN = [
  "Checking demand signals",
  "Monitoring competitor pricing",
  "Scanning maintenance alerts",
];

const AMBIENT_ES = [
  "Verificando señales de demanda",
  "Monitoreando precios de competencia",
  "Escaneando alertas de mantenimiento",
];

type UnitsAiSidebarProps = {
  isEn: boolean;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
};

export function UnitsAiSidebar({
  isEn,
  totalUnits,
  occupiedUnits,
  vacantUnits,
}: UnitsAiSidebarProps) {
  return (
    <div className="space-y-0">
      {/* AI Monitoring header */}
      <div className="space-y-2 pb-4">
        <div className="flex items-center gap-2">
          <span className="gentle-pulse h-1.5 w-1.5 rounded-full bg-[var(--agentic-cyan)]" />
          <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">
            {isEn ? "AI Monitoring" : "Monitoreo IA"}
          </span>
        </div>

        {/* Ambient status lines */}
        <motion.div
          animate="visible"
          className="space-y-1.5"
          initial="hidden"
          variants={STAGGER_VARIANTS}
        >
          {(isEn ? AMBIENT_EN : AMBIENT_ES).map((line) => (
            <motion.div
              className="flex items-center gap-2 text-xs text-muted-foreground/50"
              key={line}
              variants={FADE_VARIANT}
            >
              <span className="gentle-pulse h-1 w-1 rounded-full bg-[var(--agentic-cyan)]" />
              <span>{line}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="h-px bg-border/15" />

      {/* Unit stats */}
      <div className="space-y-1.5 py-4">
        <span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
          {isEn ? "Overview" : "Resumen"}
        </span>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground/60">
              {isEn ? "Total" : "Total"}
            </span>
            <span className="tabular-nums text-foreground/70">
              {totalUnits}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground/60">
              {isEn ? "Occupied" : "Ocupadas"}
            </span>
            <span className="tabular-nums text-foreground/70">
              {occupiedUnits}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground/60">
              {isEn ? "Vacant" : "Vacantes"}
            </span>
            <span className="tabular-nums text-foreground/70">
              {vacantUnits}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/15" />

      {/* Suggested Actions */}
      <div className="space-y-1.5 pt-4">
        <span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
          {isEn ? "Suggested Actions" : "Acciones sugeridas"}
        </span>
        <div className="space-y-1">
          <Link
            className="block text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
            href={`/app/agents?prompt=${encodeURIComponent(isEn ? "Tell me about my vacancies" : "Dime sobre mis vacantes")}`}
          >
            {isEn ? "Ask about vacancies" : "Preguntar vacantes"}
          </Link>
          <Link
            className="block text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
            href={`/app/agents?prompt=${encodeURIComponent(isEn ? "Run pricing analysis for my units" : "Ejecutar análisis de precios para mis unidades")}`}
          >
            {isEn ? "Run pricing analysis" : "Análisis de precios"}
          </Link>
          <Link
            className="block text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
            href={`/app/agents?prompt=${encodeURIComponent(isEn ? "Scan maintenance risks for my units" : "Escanear riesgos de mantenimiento para mis unidades")}`}
          >
            {isEn ? "Scan maintenance" : "Escanear mantenimiento"}
          </Link>
        </div>
      </div>
    </div>
  );
}
