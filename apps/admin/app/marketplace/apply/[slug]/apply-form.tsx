"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MarketplaceApplyFeedback } from "./components/marketplace-apply-feedback";
import { MarketplaceApplyFields } from "./components/marketplace-apply-fields";
import { useMarketplaceApplyForm } from "./hooks/use-marketplace-apply-form";

type MarketplaceApplyFormProps = {
  listingSlug: string;
  locale: "es-PY" | "en-US";
};

export function MarketplaceApplyForm({
  listingSlug,
  locale,
}: MarketplaceApplyFormProps) {
  const isEn = locale === "en-US";
  const {
    form,
    error,
    hasDraft,
    draftSavedAt,
    currentStep,
    fieldErrors,
    goToStep,
    clearDraft,
    isSubmitting,
    successId,
    onSubmit,
    prevStep,
    updateField,
  } = useMarketplaceApplyForm({
    listingSlug,
    locale,
  });

  const steps = [
    {
      id: 0 as const,
      label: isEn ? "Contact" : "Contacto",
      description: isEn ? "Who you are" : "Quién eres",
    },
    {
      id: 1 as const,
      label: isEn ? "Qualification" : "Calificación",
      description: isEn ? "Move-in and income" : "Ingreso y mudanza",
    },
    {
      id: 2 as const,
      label: isEn ? "Review & submit" : "Revisar y enviar",
      description: isEn ? "Final check" : "Chequeo final",
    },
  ];

  return (
    <Card className="min-w-0 border border-border/60 bg-card/85">
      <CardHeader className="space-y-5">
        <div className="space-y-2">
          <CardTitle>
            {isEn ? "Start application" : "Iniciar aplicación"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Three clear steps, automatic draft saving, and direct follow-up from the leasing team."
              : "Tres pasos claros, guardado automático y seguimiento directo del equipo comercial."}
          </CardDescription>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => {
            const active = currentStep === step.id;
            const complete = currentStep > step.id;

            return (
              <button
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  active
                    ? "border-foreground/20 bg-background text-foreground"
                    : complete
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border/60 bg-background/60 text-muted-foreground"
                )}
                key={step.id}
                onClick={() => goToStep(step.id)}
                type="button"
              >
                <p className="font-medium text-[11px] uppercase tracking-[0.14em]">
                  {step.id + 1}
                </p>
                <p className="mt-2 font-semibold text-sm">{step.label}</p>
                <p className="mt-1 text-xs opacity-80">{step.description}</p>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <form className="min-w-0 space-y-6" onSubmit={onSubmit}>
          <MarketplaceApplyFields
            currentStep={currentStep}
            fieldErrors={fieldErrors}
            form={form}
            isEn={isEn}
            locale={locale}
            onFieldChange={updateField}
          />

          <MarketplaceApplyFeedback
            currentStep={currentStep}
            draftSavedAt={draftSavedAt}
            error={error}
            hasDraft={hasDraft}
            isEn={isEn}
            isSubmitting={isSubmitting}
            onBack={prevStep}
            onClearDraft={clearDraft}
            successId={successId}
          />
        </form>
      </CardContent>
    </Card>
  );
}
