"use client";

import { Logout01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useActiveLocale } from "@/lib/i18n/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type SignOutButtonProps = ButtonProps & {
  redirectTo?: string;
};

export function SignOutButton({
  redirectTo = "/login",
  children,
  ...props
}: SignOutButtonProps) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    const errorMsg = isEn ? "Could not sign out" : "No se pudo cerrar sesión";

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(errorMsg, {
          description: error.message,
        });
        setBusy(false);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
      setBusy(false);
    } catch {
      setBusy(false);
    }
  };

  return (
    <Button disabled={busy} onClick={onClick} type="button" {...props}>
      <Icon icon={Logout01Icon} size={16} />
      {children ?? (isEn ? "Sign out" : "Cerrar sesión")}
    </Button>
  );
}
