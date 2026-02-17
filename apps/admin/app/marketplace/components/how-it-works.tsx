const STEPS_EN = [
  {
    number: "01",
    title: "Browse",
    description: "Explore listings with full cost breakdowns — no hidden fees.",
  },
  {
    number: "02",
    title: "Apply",
    description: "Submit a structured application online in minutes.",
  },
  {
    number: "03",
    title: "Move in",
    description: "Get a response under SLA and sign your lease.",
  },
] as const;

const STEPS_ES = [
  {
    number: "01",
    title: "Explorar",
    description: "Encontrá anuncios con desglose completo de costos — sin cargos ocultos.",
  },
  {
    number: "02",
    title: "Aplicar",
    description: "Enviá tu solicitud online de forma estructurada en minutos.",
  },
  {
    number: "03",
    title: "Mudarte",
    description: "Recibí respuesta con plazo garantizado y firmá tu contrato.",
  },
] as const;

export function HowItWorks({ isEn }: { isEn: boolean }) {
  const steps = isEn ? STEPS_EN : STEPS_ES;

  return (
    <section className="py-4" id="how-it-works">
      <h2 className="mb-6 text-center font-serif text-2xl font-medium tracking-tight text-[var(--marketplace-text)]">
        {isEn ? "How it works" : "Cómo funciona"}
      </h2>

      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            className="relative flex flex-col items-center rounded-2xl bg-[var(--marketplace-bg-muted)] px-6 py-8 text-center"
            key={step.title}
          >
            <span className="mb-4 font-serif text-4xl font-light text-primary/30">
              {step.number}
            </span>
            <h3 className="mb-2 font-serif text-lg font-medium text-[var(--marketplace-text)]">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--marketplace-text-muted)]">
              {step.description}
            </p>
            {i < steps.length - 1 ? (
              <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-[#e8e4df] sm:block" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
