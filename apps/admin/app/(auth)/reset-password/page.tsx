"use client";

import { ArrowRight01Icon, LockPasswordIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useActiveLocale } from "@/lib/i18n/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      toast.error(
        isEn ? "Supabase is not configured" : "Supabase no está configurado",
        {
          description: isEn
            ? "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/admin/.env.local."
            : "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en apps/admin/.env.local.",
        }
      );
      return;
    }

    if (!hasSession) {
      toast.error(isEn ? "Missing session" : "Falta sesión", {
        description: isEn
          ? "Open the reset link from your email to continue."
          : "Abre el enlace de restablecimiento desde tu correo para continuar.",
      });
      return;
    }

    if (!password || password.length < 8) {
      toast.error(isEn ? "Password too short" : "Contraseña muy corta", {
        description: isEn
          ? "Use at least 8 characters."
          : "Usa al menos 8 caracteres.",
      });
      return;
    }
    if (password !== confirm) {
      toast.error(
        isEn ? "Passwords do not match" : "Las contraseñas no coinciden",
        {
          description: isEn
            ? "Re-enter your new password."
            : "Vuelve a escribir tu nueva contraseña.",
        }
      );
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(isEn ? "Could not update" : "No se pudo actualizar", {
          description: error.message,
        });
        return;
      }
      toast.success(isEn ? "Password updated" : "Contraseña actualizada");
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_0%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_45%),radial-gradient(circle_at_100%_10%,color-mix(in_oklch,var(--chart-2)_12%,transparent),transparent_55%)]" />

      <CardHeader className="relative">
        <CardTitle className="text-2xl">
          {isEn ? "Choose a new password" : "Elige una nueva contraseña"}
        </CardTitle>
        <CardDescription>
          {isEn
            ? "Set a new password for your account."
            : "Establece una nueva contraseña para tu cuenta."}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {supabase ? (
          ready && !hasSession ? (
            <div className="space-y-2 text-muted-foreground text-sm">
              <p>
                {isEn
                  ? "Open the reset link from your email to continue."
                  : "Abre el enlace de restablecimiento desde tu correo para continuar."}
              </p>
              <p>
                {isEn
                  ? "You can request a new link from"
                  : "Puedes solicitar un nuevo enlace desde"}{" "}
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  href="/forgot-password"
                >
                  {isEn ? "Reset password" : "Restablecer contraseña"}
                </Link>
                .
              </p>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-1 block font-medium text-muted-foreground text-xs">
                  {isEn ? "New password" : "Nueva contraseña"}
                </span>
                <div className="relative">
                  <Icon
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    icon={LockPasswordIcon}
                    size={16}
                  />
                  <Input
                    autoComplete="new-password"
                    className="pl-9"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      isEn ? "At least 8 characters" : "Al menos 8 caracteres"
                    }
                    type="password"
                    value={password}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium text-muted-foreground text-xs">
                  {isEn ? "Confirm password" : "Confirmar contraseña"}
                </span>
                <div className="relative">
                  <Icon
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    icon={LockPasswordIcon}
                    size={16}
                  />
                  <Input
                    autoComplete="new-password"
                    className="pl-9"
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder={
                      isEn
                        ? "Re-enter the password"
                        : "Vuelve a escribir la contraseña"
                    }
                    type="password"
                    value={confirm}
                  />
                </div>
              </label>

              <Button
                className="group w-full gap-2"
                disabled={busy}
                type="submit"
              >
                <span
                  className={cn(
                    "transition-opacity",
                    busy ? "opacity-60" : "opacity-100"
                  )}
                >
                  {isEn ? "Update password" : "Actualizar contraseña"}
                </span>
                <Icon
                  className={cn(
                    "transition-transform",
                    busy ? "translate-x-0" : "group-hover:translate-x-0.5"
                  )}
                  icon={ArrowRight01Icon}
                  size={18}
                />
              </Button>
            </form>
          )
        ) : (
          <p className="text-muted-foreground text-sm">
            {isEn
              ? "Supabase is not configured. Set"
              : "Supabase no está configurado. Configura"}{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            {isEn ? "and" : "y"}{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            .
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link
            className="text-primary underline-offset-4 hover:underline"
            href="/login"
          >
            {isEn ? "Back to sign in" : "Volver a iniciar sesión"}
          </Link>
          <Link
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="/signup"
          >
            {isEn ? "Create account" : "Crear cuenta"}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
