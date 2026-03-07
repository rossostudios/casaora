import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { MarketplaceApplyStep } from "../hooks/use-marketplace-apply-form";

type MarketplaceApplyFeedbackProps = {
  isEn: boolean;
  isSubmitting: boolean;
  error: string | null;
  successId: string | null;
  currentStep: MarketplaceApplyStep;
  hasDraft: boolean;
  draftSavedAt: string | null;
  onBack: () => void;
  onClearDraft: () => void;
};

function formatSavedAt(value: string | null, locale: "en-US" | "es-PY"): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function MarketplaceApplyFeedback({
  isEn,
  isSubmitting,
  error,
  successId,
  currentStep,
  hasDraft,
  draftSavedAt,
  onBack,
  onClearDraft,
}: MarketplaceApplyFeedbackProps) {
  const locale = isEn ? "en-US" : "es-PY";
  const savedAtLabel = formatSavedAt(draftSavedAt, locale);
  const primaryLabel =
    currentStep < 2
      ? isEn
        ? "Continue"
        : "Continuar"
      : isSubmitting
        ? isEn
          ? "Submitting..."
          : "Enviando..."
        : isEn
          ? "Submit application"
          : "Enviar aplicación";

  return (
    <div aria-live="polite" className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>
            {isEn
              ? "Could not submit application"
              : "No se pudo enviar la aplicación"}
          </AlertTitle>
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      ) : null}

      {successId ? (
        <Alert variant="success">
          <AlertTitle>
            {isEn
              ? "Application submitted successfully."
              : "Aplicación enviada correctamente."}
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs">
            ID: <span className="font-mono">{successId}</span>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {hasDraft
              ? isEn
                ? "Progress is saved automatically."
                : "El progreso se guarda automáticamente."
              : isEn
                ? "Complete the next step to keep moving."
                : "Completa el siguiente paso para avanzar."}
          </p>
          {savedAtLabel ? (
            <p className="text-muted-foreground text-xs">
              {isEn ? "Last saved" : "Último guardado"}: {savedAtLabel}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentStep > 0 ? (
            <Button onClick={onBack} size="sm" type="button" variant="outline">
              {isEn ? "Back" : "Atrás"}
            </Button>
          ) : null}
          <Button
            onClick={onClearDraft}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isEn ? "Clear draft" : "Limpiar borrador"}
          </Button>
          <Button className="min-w-36" disabled={isSubmitting} type="submit">
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
