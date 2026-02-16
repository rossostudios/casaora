"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      if (!body.full_name || !body.email || !body.message) {
        setState("error");
        setErrorMsg(
          isEn ? "Please fill in all required fields." : "Completa todos los campos requeridos."
        );
        return;
      }

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
          throw new Error(
            (data as Record<string, string>).message ??
              `Request failed (${res.status})`
          );
        }

        setState("success");
      } catch (err) {
        setState("error");
        setErrorMsg(
          err instanceof Error
            ? err.message
            : isEn
              ? "Something went wrong."
              : "Algo salió mal."
        );
      }
    },
    [slug, isEn]
  );

  if (state === "success") {
    return (
      <Card className="min-w-0">
        <CardContent className="py-8 text-center">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {isEn
              ? "Your message has been sent!"
              : "¡Tu mensaje ha sido enviado!"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isEn
              ? "The property manager will get back to you soon."
              : "El administrador de la propiedad se pondrá en contacto contigo pronto."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">
          {isEn ? "Send a message" : "Enviar un mensaje"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="inquiry-name">
              {isEn ? "Full name" : "Nombre completo"} *
            </label>
            <Input
              id="inquiry-name"
              name="full_name"
              placeholder={isEn ? "Your full name" : "Tu nombre completo"}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="inquiry-email">
              {isEn ? "Email" : "Correo electrónico"} *
            </label>
            <Input
              id="inquiry-email"
              name="email"
              placeholder="email@example.com"
              required
              type="email"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="inquiry-phone">
              {isEn ? "Phone (optional)" : "Teléfono (opcional)"}
            </label>
            <Input
              id="inquiry-phone"
              name="phone_e164"
              placeholder="+595 981 000 000"
              type="tel"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="inquiry-message">
              {isEn ? "Message" : "Mensaje"} *
            </label>
            <Textarea
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
            <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
          ) : null}

          <Button
            className="w-full"
            disabled={state === "submitting"}
            size="sm"
            type="submit"
          >
            {state === "submitting"
              ? isEn
                ? "Sending..."
                : "Enviando..."
              : isEn
                ? "Send message"
                : "Enviar mensaje"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
