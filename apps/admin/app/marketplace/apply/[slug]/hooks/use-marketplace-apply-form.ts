import { useEffect, useMemo, useState } from "react";

export type MarketplaceApplyFormState = {
  full_name: string;
  email: string;
  phone_e164: string;
  document_number: string;
  preferred_move_in: string;
  monthly_income: string;
  guarantee_choice: "cash_deposit" | "guarantor_product";
  message: string;
};

export type MarketplaceApplyFieldErrors = Partial<
  Record<keyof MarketplaceApplyFormState, string>
>;

export type MarketplaceApplyStep = 0 | 1 | 2;

type StoredMarketplaceDraft = {
  form: MarketplaceApplyFormState;
  updatedAt: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function defaultFormState(): MarketplaceApplyFormState {
  return {
    full_name: "",
    email: "",
    phone_e164: "",
    document_number: "",
    preferred_move_in: "",
    monthly_income: "",
    guarantee_choice: "cash_deposit",
    message: "",
  };
}

function isFormEmpty(form: MarketplaceApplyFormState): boolean {
  const defaults = defaultFormState();
  return (Object.keys(defaults) as Array<keyof MarketplaceApplyFormState>).every(
    (key) => form[key] === defaults[key]
  );
}

function validateFields(params: {
  form: MarketplaceApplyFormState;
  isEn: boolean;
  fields: Array<keyof MarketplaceApplyFormState>;
}): MarketplaceApplyFieldErrors {
  const { form, isEn, fields } = params;
  const errors: MarketplaceApplyFieldErrors = {};

  for (const field of fields) {
    switch (field) {
      case "full_name":
        if (!form.full_name.trim()) {
          errors.full_name = isEn
            ? "Enter your full name."
            : "Ingresa tu nombre completo.";
        }
        break;
      case "email":
        if (!form.email.trim()) {
          errors.email = isEn ? "Enter your email." : "Ingresa tu email.";
        } else if (!EMAIL_RE.test(form.email.trim())) {
          errors.email = isEn
            ? "Enter a valid email."
            : "Ingresa un email válido.";
        }
        break;
      case "preferred_move_in":
        if (!form.preferred_move_in.trim()) {
          errors.preferred_move_in = isEn
            ? "Choose your preferred move-in date."
            : "Elige tu fecha de ingreso preferida.";
        }
        break;
      case "monthly_income":
        if (!form.monthly_income.trim()) {
          errors.monthly_income = isEn
            ? "Enter your monthly income."
            : "Ingresa tu ingreso mensual.";
          break;
        }
        if (!Number.isFinite(Number(form.monthly_income))) {
          errors.monthly_income = isEn
            ? "Income must be a number."
            : "El ingreso debe ser un número.";
        }
        break;
      default:
        break;
    }
  }

  return errors;
}

export function useMarketplaceApplyForm(params: {
  listingSlug: string;
  locale: "es-PY" | "en-US";
}) {
  const { listingSlug, locale } = params;
  const isEn = locale === "en-US";
  const storageKey = useMemo(
    () => `casaora.marketplace.apply.${listingSlug}`,
    [listingSlug]
  );

  const [form, setForm] = useState<MarketplaceApplyFormState>(defaultFormState);
  const [currentStep, setCurrentStep] = useState<MarketplaceApplyStep>(0);
  const [fieldErrors, setFieldErrors] = useState<MarketplaceApplyFieldErrors>(
    {}
  );
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyStartUrl = useMemo(
    () => `/api/public/listings/${encodeURIComponent(listingSlug)}/apply-start`,
    [listingSlug]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch(applyStartUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    }).catch(() => {
      // Ignore telemetry failures.
    });

    return () => controller.abort();
  }, [applyStartUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setHasDraft(false);
        setHasHydratedDraft(true);
        return;
      }

      const parsed = JSON.parse(stored) as StoredMarketplaceDraft;
      if (parsed?.form && typeof parsed.form === "object") {
        setForm({
          ...defaultFormState(),
          ...parsed.form,
        });
        setDraftSavedAt(
          typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
        );
        setHasDraft(true);
      }
    } catch {
      // Ignore malformed drafts and start clean.
    } finally {
      setHasHydratedDraft(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!(hasHydratedDraft && typeof window !== "undefined")) return;

    if (isFormEmpty(form)) {
      window.localStorage.removeItem(storageKey);
      setHasDraft(false);
      return;
    }

    const updatedAt = new Date().toISOString();
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        form,
        updatedAt,
      } satisfies StoredMarketplaceDraft)
    );
    setDraftSavedAt(updatedAt);
    setHasDraft(true);
  }, [form, hasHydratedDraft, storageKey]);

  const updateField = <K extends keyof MarketplaceApplyFormState>(
    key: K,
    value: MarketplaceApplyFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccessId(null);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  function validateStep(step: MarketplaceApplyStep): boolean {
    const stepFields =
      step === 0
        ? (["full_name", "email"] as const)
        : step === 1
          ? (["preferred_move_in", "monthly_income"] as const)
          : ([
              "full_name",
              "email",
              "preferred_move_in",
              "monthly_income",
            ] as const);

    const nextErrors = validateFields({
      form,
      fields: [...stepFields],
      isEn,
    });
    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function goToStep(nextStep: MarketplaceApplyStep) {
    if (nextStep <= currentStep) {
      setCurrentStep(nextStep);
      return;
    }
    if (nextStep === 1 && validateStep(0)) {
      setCurrentStep(1);
    }
    if (nextStep === 2 && validateStep(0) && validateStep(1)) {
      setCurrentStep(2);
    }
  }

  function clearDraft() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
    setForm(defaultFormState());
    setCurrentStep(0);
    setFieldErrors({});
    setDraftSavedAt(null);
    setHasDraft(false);
    setSuccessId(null);
    setError(null);
  }

  async function submitApplication() {
    setError(null);
    setSuccessId(null);

    const nextErrors = validateFields({
      form,
      fields: [
        "full_name",
        "email",
        "preferred_move_in",
        "monthly_income",
      ],
      isEn,
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      if (nextErrors.full_name || nextErrors.email) {
        setCurrentStep(0);
      } else {
        setCurrentStep(1);
      }
      return;
    }

    setIsSubmitting(true);

    const incomeValue = form.monthly_income.trim();
    const parsedIncome = incomeValue ? Number(incomeValue) : null;

    const payload: Record<string, unknown> = {
      listing_slug: listingSlug,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone_e164: form.phone_e164.trim() || undefined,
      document_number: form.document_number.trim() || undefined,
      monthly_income:
        parsedIncome !== null && Number.isFinite(parsedIncome)
          ? parsedIncome
          : undefined,
      guarantee_choice: form.guarantee_choice,
      message: form.message.trim() || undefined,
      source: "marketplace",
      metadata: {
        locale,
        preferred_move_in: form.preferred_move_in.trim() || undefined,
      },
    };

    try {
      const response = await fetch("/api/public/listings/applications", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => "");
        let detailMessage = details;
        if (details) {
          try {
            const parsed = JSON.parse(details) as {
              error?: unknown;
              detail?: unknown;
              message?: unknown;
            };
            const detail =
              parsed.error ?? parsed.detail ?? parsed.message ?? details;
            detailMessage =
              typeof detail === "string" ? detail : JSON.stringify(detail);
          } catch {
            detailMessage = details;
          }
        }
        const suffix = detailMessage ? `: ${detailMessage.slice(0, 240)}` : "";
        throw new Error(`HTTP ${response.status}${suffix}`);
      }

      const result = (await response.json()) as { id?: string };
      const nextId = typeof result.id === "string" ? result.id : null;
      clearDraft();
      setSuccessId(nextId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentStep < 2) {
      const nextStep = (currentStep + 1) as MarketplaceApplyStep;
      goToStep(nextStep);
      return;
    }

    await submitApplication();
  }

  return {
    form,
    error,
    hasDraft,
    draftSavedAt,
    currentStep,
    fieldErrors,
    goToStep,
    clearDraft,
    isSubmitting,
    onSubmit,
    prevStep: () =>
      setCurrentStep((prev) => Math.max(0, prev - 1) as MarketplaceApplyStep),
    successId,
    updateField,
  };
}
