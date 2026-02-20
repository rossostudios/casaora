"use client";

import { useCallback, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

type ListingInquiryFormProps = {
  slug: string;
  isEn: boolean;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function ListingInquiryForm({ slug, isEn }: ListingInquiryFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setState("submitting");
      setErrorMsg("");

      const form = new FormData(e.currentTarget);
      const body = {
        full_name: (form.get("full_name") as string)?.trim(),
        email: (form.get("email") as string)?.trim(),
        phone_e164: (form.get("phone_e164") as string)?.trim() || undefined,
        message: (form.get("message") as string)?.trim(),
      };

      if (!(body.full_name && body.email && body.message)) {
        setState("error");
        setErrorMsg(
          isEn
            ? "Please fill in all required fields."
            : "Completa todos los campos requeridos."
        );
        return;
      }

      const catchFallbackMsg = isEn
        ? "Something went wrong."
        : "Algo salió mal.";

      try {
        const res = await fetch(
          `${API_BASE}/public/listings/${encodeURIComponent(slug)}/inquire`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const serverMsg = (data as Record<string, string>).message;
          let errText = `Request failed (${res.status})`;
          if (serverMsg) {
            errText = serverMsg;
          }
          setState("error");
          setErrorMsg(errText);
          return;
        }

        setState("success");
      } catch (err) {
        setState("error");
        let msg = catchFallbackMsg;
        if (err instanceof Error) {
          msg = err.message;
        }
        setErrorMsg(msg);
      }
    },
    [slug, isEn]
  );

  if (state === "success") {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-[var(--marketplace-card-shadow)]">
        <p className="font-medium font-serif text-emerald-700 text-lg">
          {isEn ? "Message sent!" : "¡Mensaje enviado!"}
        </p>
        <p className="mt-2 text-[var(--marketplace-text-muted)] text-xs">
          {isEn
            ? "The property manager will get back to you soon."
            : "El administrador de la propiedad se pondrá en contacto contigo pronto."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[var(--marketplace-card-shadow)]">
      <h3 className="mb-4 font-medium font-serif text-[var(--marketplace-text)] text-base">
        {isEn ? "Get in touch" : "Ponete en contacto"}
      </h3>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-1.5">
          <label
            className="font-medium text-[var(--marketplace-text-muted)] text-xs"
            htmlFor="inquiry-name"
          >
            {isEn ? "Full name" : "Nombre completo"} *
          </label>
          <Input
            className="rounded-xl border-[#e8e4df] bg-[var(--marketplace-bg-muted)]"
            id="inquiry-name"
            name="full_name"
            placeholder={isEn ? "Your full name" : "Tu nombre completo"}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <label
            className="font-medium text-[var(--marketplace-text-muted)] text-xs"
            htmlFor="inquiry-email"
          >
            {isEn ? "Email" : "Correo electrónico"} *
          </label>
          <Input
            className="rounded-xl border-[#e8e4df] bg-[var(--marketplace-bg-muted)]"
            id="inquiry-email"
            name="email"
            placeholder="email@example.com"
            required
            type="email"
          />
        </div>

        <div className="grid gap-1.5">
          <label
            className="font-medium text-[var(--marketplace-text-muted)] text-xs"
            htmlFor="inquiry-phone"
          >
            {isEn ? "Phone (optional)" : "Teléfono (opcional)"}
          </label>
          <Input
            className="rounded-xl border-[#e8e4df] bg-[var(--marketplace-bg-muted)]"
            id="inquiry-phone"
            name="phone_e164"
            placeholder="+595 981 000 000"
            type="tel"
          />
        </div>

        <div className="grid gap-1.5">
          <label
            className="font-medium text-[var(--marketplace-text-muted)] text-xs"
            htmlFor="inquiry-message"
          >
            {isEn ? "Message" : "Mensaje"} *
          </label>
          <Textarea
            className="rounded-xl border-[#e8e4df] bg-[var(--marketplace-bg-muted)]"
            id="inquiry-message"
            name="message"
            placeholder={
              isEn
                ? "I'm interested in this listing..."
                : "Estoy interesado en este anuncio..."
            }
            required
            rows={3}
          />
        </div>

        {state === "error" && errorMsg ? (
          <p className="text-red-600 text-xs">{errorMsg}</p>
        ) : null}

        <button
          className="flex h-10 w-full items-center justify-center rounded-xl bg-casaora-gradient-warm font-medium text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          disabled={state === "submitting"}
          type="submit"
        >
          {state === "submitting"
            ? isEn
              ? "Sending..."
              : "Enviando..."
            : isEn
              ? "Send message"
              : "Enviar mensaje"}
        </button>
      </form>
    </div>
  );
}
