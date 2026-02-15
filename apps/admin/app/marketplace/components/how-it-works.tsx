import { Home01Icon, Mail01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";

const STEPS_EN = [
  {
    icon: Search01Icon,
    title: "Browse",
    description: "Explore listings with full cost breakdowns — no hidden fees.",
  },
  {
    icon: Mail01Icon,
    title: "Apply",
    description: "Submit a structured application online in minutes.",
  },
  {
    icon: Home01Icon,
    title: "Move in",
    description: "Get a response under SLA and sign your lease.",
  },
] as const;

const STEPS_ES = [
  {
    icon: Search01Icon,
    title: "Explorar",
    description: "Encontrá anuncios con desglose completo de costos — sin cargos ocultos.",
  },
  {
    icon: Mail01Icon,
    title: "Aplicar",
    description: "Enviá tu solicitud online de forma estructurada en minutos.",
  },
  {
    icon: Home01Icon,
    title: "Mudarte",
    description: "Recibí respuesta con plazo garantizado y firmá tu contrato.",
  },
] as const;

export function HowItWorks({ isEn }: { isEn: boolean }) {
  const steps = isEn ? STEPS_EN : STEPS_ES;

  return (
    <section className="py-2" id="how-it-works">
      <h2 className="mb-5 text-center font-semibold text-lg tracking-tight">
        {isEn ? "How it works" : "Cómo funciona"}
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            className="flex flex-col items-center rounded-2xl border border-border/70 bg-card/80 px-5 py-6 text-center"
            key={step.title}
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon icon={step.icon} size={20} />
            </span>
            <span className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
              {i + 1}
            </span>
            <h3 className="mb-1 font-semibold text-sm">{step.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
