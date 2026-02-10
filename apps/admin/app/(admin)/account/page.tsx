import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { LanguageSelector } from "@/components/preferences/language-selector";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { getActiveLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{isEn ? "Account" : "Cuenta"}</Badge>
            <Badge className="text-[11px]" variant="secondary">
              Supabase Auth
            </Badge>
          </div>
          <CardTitle className="text-2xl">
            {user.email ?? (isEn ? "Signed in" : "Sesión iniciada")}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Manage your session and basic identity info."
              : "Administra tu sesión e información básica de identidad."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <p className="font-medium text-muted-foreground text-xs">
                {isEn ? "User ID" : "ID de usuario"}
              </p>
              <p className="truncate font-mono text-xs" title={user.id}>
                {user.id}
              </p>
            </div>
            <CopyButton className="h-8" value={user.id} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <SignOutButton variant="outline" />
          </div>
        </CardContent>
      </Card>

      <Card id="preferencias">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {isEn ? "Preferences" : "Preferencias"}
            </Badge>
          </div>
          <CardTitle className="text-2xl">
            {isEn ? "Preferences" : "Preferencias"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Personal settings for your account (language, formats, and more)."
              : "Ajustes personales de tu cuenta (idioma, formato y más)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-medium text-sm">
                {isEn ? "Language" : "Idioma"}
              </p>
              <p className="text-muted-foreground text-sm">
                {isEn
                  ? "Spanish is the default. More languages soon."
                  : "Español es el predeterminado. Más idiomas pronto."}
              </p>
            </div>
            <div className="w-full md:w-64">
              <LanguageSelector />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
