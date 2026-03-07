import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  MarketplaceApplyFieldErrors,
  MarketplaceApplyFormState,
  MarketplaceApplyStep,
} from "../hooks/use-marketplace-apply-form";

type MarketplaceApplyFieldsProps = {
  locale: "es-PY" | "en-US";
  isEn: boolean;
  form: MarketplaceApplyFormState;
  currentStep: MarketplaceApplyStep;
  fieldErrors: MarketplaceApplyFieldErrors;
  onFieldChange: <K extends keyof MarketplaceApplyFormState>(
    key: K,
    value: MarketplaceApplyFormState[K]
  ) => void;
};

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
        {label}
      </p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export function MarketplaceApplyFields({
  locale,
  isEn,
  form,
  currentStep,
  fieldErrors,
  onFieldChange,
}: MarketplaceApplyFieldsProps) {
  if (currentStep === 0) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">
            {isEn ? "Contact" : "Contacto"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {isEn
              ? "Tell us who you are so the leasing team can follow up without friction."
              : "Cuéntanos quién eres para que el equipo comercial haga seguimiento sin fricción."}
          </p>
        </div>

        <FieldGroup>
          <Field
            description={
              isEn
                ? "Use the same name shown on your identity document."
                : "Usa el mismo nombre que figura en tu documento."
            }
            error={fieldErrors.full_name}
            htmlFor="full_name"
            label={isEn ? "Full name" : "Nombre completo"}
            required
          >
            <Input
              id="full_name"
              name="full_name"
              onChange={(event) => onFieldChange("full_name", event.target.value)}
              required
              value={form.full_name}
            />
          </Field>

          <Field
            description={
              isEn
                ? "We will use this for qualification updates."
                : "Lo usaremos para enviarte actualizaciones de calificación."
            }
            error={fieldErrors.email}
            htmlFor="email"
            label="Email"
            required
          >
            <Input
              id="email"
              name="email"
              onChange={(event) => onFieldChange("email", event.target.value)}
              required
              type="email"
              value={form.email}
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field
            description={
              isEn
                ? "WhatsApp works best for fast scheduling."
                : "WhatsApp funciona mejor para agendar rápido."
            }
            htmlFor="phone_e164"
            label={isEn ? "Phone" : "Teléfono"}
          >
            <Input
              id="phone_e164"
              name="phone_e164"
              onChange={(event) =>
                onFieldChange("phone_e164", event.target.value)
              }
              placeholder="+595..."
              value={form.phone_e164}
            />
          </Field>

          <Field
            description={
              isEn
                ? "Optional, but it helps pre-fill later checks."
                : "Opcional, pero ayuda a prellenar validaciones posteriores."
            }
            htmlFor="document_number"
            label={isEn ? "Document number" : "Número de documento"}
          >
            <Input
              id="document_number"
              name="document_number"
              onChange={(event) =>
                onFieldChange("document_number", event.target.value)
              }
              value={form.document_number}
            />
          </Field>
        </FieldGroup>
      </div>
    );
  }

  if (currentStep === 1) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">
            {isEn ? "Qualification" : "Calificación"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {isEn
              ? "Share move-in timing and income so we can qualify you clearly."
              : "Comparte tu fecha ideal e ingresos para calificarte con claridad."}
          </p>
        </div>

        <FieldGroup>
          <Field
            error={fieldErrors.preferred_move_in}
            htmlFor="preferred_move_in"
            label={isEn ? "Preferred move-in date" : "Fecha de ingreso preferida"}
            required
          >
            <DatePicker
              id="preferred_move_in"
              locale={locale}
              onValueChange={(next) => onFieldChange("preferred_move_in", next)}
              value={form.preferred_move_in}
            />
          </Field>

          <Field
            description={
              isEn
                ? "Gross household income per month."
                : "Ingreso mensual bruto del hogar."
            }
            error={fieldErrors.monthly_income}
            htmlFor="monthly_income"
            label={isEn ? "Monthly income" : "Ingreso mensual"}
            required
          >
            <Input
              id="monthly_income"
              min={0}
              name="monthly_income"
              onChange={(event) =>
                onFieldChange("monthly_income", event.target.value)
              }
              step="0.01"
              type="number"
              value={form.monthly_income}
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field
            description={
              isEn
                ? "Choose how you expect to guarantee the lease."
                : "Elige cómo planeas garantizar el contrato."
            }
            htmlFor="guarantee_choice"
            label={isEn ? "Guarantee option" : "Opción de garantía"}
          >
            <Select
              id="guarantee_choice"
              name="guarantee_choice"
              onChange={(event) =>
                onFieldChange(
                  "guarantee_choice",
                  event.target
                    .value as MarketplaceApplyFormState["guarantee_choice"]
                )
              }
              value={form.guarantee_choice}
            >
              <option value="cash_deposit">
                {isEn ? "Cash deposit" : "Depósito en efectivo"}
              </option>
              <option value="guarantor_product">
                {isEn ? "Guarantor product" : "Producto garante"}
              </option>
            </Select>
          </Field>

          <Field
            description={
              isEn
                ? "Optional context about your timeline, household, or questions."
                : "Contexto opcional sobre tiempos, hogar o preguntas."
            }
            htmlFor="message"
            label={isEn ? "Message" : "Mensaje"}
          >
            <Textarea
              id="message"
              name="message"
              onChange={(event) => onFieldChange("message", event.target.value)}
              placeholder={
                isEn
                  ? "Tell us your profile and anything the agent should know."
                  : "Cuéntanos tu perfil y cualquier detalle relevante."
              }
              value={form.message}
            />
          </Field>
        </FieldGroup>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold text-lg">
          {isEn ? "Review & submit" : "Revisar y enviar"}
        </h3>
        <p className="text-muted-foreground text-sm">
          {isEn
            ? "Check the details below before sending your application."
            : "Revisa los datos antes de enviar tu aplicación."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ReviewItem
          label={isEn ? "Applicant" : "Postulante"}
          value={form.full_name}
        />
        <ReviewItem label="Email" value={form.email} />
        <ReviewItem
          label={isEn ? "Phone" : "Teléfono"}
          value={form.phone_e164}
        />
        <ReviewItem
          label={isEn ? "Document" : "Documento"}
          value={form.document_number}
        />
        <ReviewItem
          label={isEn ? "Move-in date" : "Fecha de ingreso"}
          value={form.preferred_move_in}
        />
        <ReviewItem
          label={isEn ? "Monthly income" : "Ingreso mensual"}
          value={form.monthly_income}
        />
        <ReviewItem
          label={isEn ? "Guarantee" : "Garantía"}
          value={
            form.guarantee_choice === "cash_deposit"
              ? isEn
                ? "Cash deposit"
                : "Depósito en efectivo"
              : isEn
                ? "Guarantor product"
                : "Producto garante"
          }
        />
        <ReviewItem
          label={isEn ? "Message" : "Mensaje"}
          value={form.message}
        />
      </div>
    </div>
  );
}
