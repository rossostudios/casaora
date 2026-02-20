"use client";

import {
  AppleIcon,
  Building01Icon,
  GoogleIcon,
  LockPasswordIcon,
  Mail01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { type FormEvent, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getAdminUrl } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const adminUrl = getAdminUrl();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      toast.error("Supabase is not configured", {
        description:
          "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
      });
      return;
    }

    const trimmedEmail = email.trim();
    if (!(trimmedEmail && password)) {
      toast.error("Missing information", {
        description: "Enter your email and password to sign in.",
      });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        toast.error("Could not sign in", { description: error.message });
        setBusy(false);
        return;
      }
      toast.success("Welcome back");
      window.location.href = `${adminUrl}/app`;
    } catch {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    if (!supabase) {
      toast.error("Supabase is not configured");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`${adminUrl}/app`)}`,
      },
    });
    if (error) {
      toast.error("Could not sign in", { description: error.message });
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Logo */}
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
        <Icon icon={Building01Icon} size={24} />
      </div>

      {/* Heading */}
      <h1 className="font-semibold text-2xl tracking-tight">Welcome back!</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Enter email & password to continue.
      </p>

      {/* Form */}
      <form className="mt-8 w-full space-y-4" onSubmit={onSubmit}>
        {/* Email */}
        <div className="relative">
          <Icon
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            icon={Mail01Icon}
            size={18}
          />
          <Input
            autoComplete="email"
            className="h-12 rounded-full pl-10 text-sm"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            type="email"
            value={email}
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Icon
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            icon={LockPasswordIcon}
            size={18}
          />
          <Input
            autoComplete="current-password"
            className="h-12 rounded-full pr-11 pl-10 text-sm"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            type="button"
          >
            <Icon icon={showPassword ? ViewOffIcon : ViewIcon} size={18} />
          </button>
        </div>

        {/* Forgot password */}
        <div className="flex items-center justify-end">
          <Link
            className="font-semibold text-sm transition-colors hover:text-primary"
            href="/forgot-password"
          >
            Forgot password
          </Link>
        </div>

        {/* Sign In button */}
        <Button
          className="h-12 w-full rounded-full bg-foreground text-background shadow-none hover:bg-foreground/90"
          disabled={busy}
          type="submit"
        >
          {busy ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex w-full items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-muted-foreground text-xs">Or sign in with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Social buttons */}
      <div className="grid w-full grid-cols-2 gap-3">
        <Button
          className="h-12 gap-2 rounded-full"
          onClick={() => handleOAuth("google")}
          type="button"
          variant="outline"
        >
          <Icon icon={GoogleIcon} size={18} />
          Google
        </Button>
        <Button
          className="h-12 gap-2 rounded-full"
          onClick={() => handleOAuth("apple")}
          type="button"
          variant="outline"
        >
          <Icon icon={AppleIcon} size={18} />
          Apple
        </Button>
      </div>

      {/* Create account */}
      <p className="mt-8 text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          href="/signup"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
