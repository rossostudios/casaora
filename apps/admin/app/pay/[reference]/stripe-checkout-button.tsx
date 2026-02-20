"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

export function StripeCheckoutButton({
  referenceCode,
  formattedAmount,
  isEn,
}: {
  referenceCode: string;
  formattedAmount: string;
  isEn: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");
    const successUrl = `${window.location.origin}/pay/${referenceCode}?success=1`;
    const cancelUrl = `${window.location.origin}/pay/${referenceCode}?cancelled=1`;
    const fallbackError = isEn ? "Payment unavailable" : "Pago no disponible";
    try {
      const res = await fetch(
        `${API_BASE}/public/payment/${referenceCode}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = (data as Record<string, string>).detail;
        if (detail) {
          setError(detail);
        } else {
          setError(fallbackError);
        }
        setLoading(false);
        return;
      }
      const data = (await res.json()) as Record<string, string>;
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
      setLoading(false);
    } catch (err) {
      let msg = String(err);
      if (err instanceof Error) msg = err.message;
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={loading}
        onClick={handleCheckout}
        size="lg"
      >
        {loading
          ? isEn
            ? "Redirecting..."
            : "Redirigiendo..."
          : isEn
            ? `Pay ${formattedAmount} with Card`
            : `Pagar ${formattedAmount} con Tarjeta`}
      </Button>
      {error && <p className="text-center text-red-600 text-sm">{error}</p>}
    </div>
  );
}
