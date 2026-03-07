"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildAgentContextHref } from "@/lib/ai-context";
import { EASING } from "@/lib/module-helpers";

const CHIPS_EN = [
  "What needs attention today?",
  "Create a cleaning task",
  "Log a maintenance request",
  "Show overdue items",
];

const CHIPS_ES = [
  "\u00bfQu\u00e9 necesita atenci\u00f3n hoy?",
  "Crear tarea de limpieza",
  "Registrar solicitud de mantenimiento",
  "Mostrar items vencidos",
];

type OperationsChipsProps = {
  isEn: boolean;
};

export function OperationsChips({ isEn }: OperationsChipsProps) {
  const pathname = usePathname();
  const chips = isEn ? CHIPS_EN : CHIPS_ES;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2"
      initial={{ opacity: 0, y: 8 }}
      transition={{ delay: 0.3, duration: 0.4, ease: EASING }}
    >
      {chips.map((chip, i) => (
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0.95 }}
          key={chip}
          transition={{
            delay: 0.35 + i * 0.04,
            duration: 0.25,
            ease: EASING,
          }}
        >
          <Link
            className="glass-inner inline-block rounded-full px-3.5 py-2 text-[12.5px] text-muted-foreground/70 transition-all hover:text-foreground hover:shadow-sm"
            href={buildAgentContextHref({
              prompt: chip,
              context: {
                source: "operations",
                entityIds: [],
                filters: { workspace: "operations" },
                summary: isEn
                  ? "Operations workspace with active tasks and maintenance."
                  : "Espacio operativo con tareas y mantenimientos activos.",
                returnPath: pathname,
              },
            })}
          >
            {chip}
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
