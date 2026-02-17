import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { SecuritySettings } from "./security-settings";

export default async function SecurityPage() {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const factors = await supabase.auth.mfa.listFactors();
  const totpFactors = (factors.data?.totp ?? []).map((f) => ({
    id: f.id,
    friendly_name: f.friendly_name ?? "",
    status: f.status,
    created_at: f.created_at,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {isEn ? "Settings" : "Configuración"}
            </Badge>
            <Badge className="text-[11px]" variant="secondary">
              {isEn ? "Security" : "Seguridad"}
            </Badge>
          </div>
          <CardTitle className="text-2xl">
            {isEn ? "Security" : "Seguridad"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Manage two-factor authentication and review active sessions."
              : "Gestiona autenticación de dos factores y revisa sesiones activas."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SecuritySettings
            totpFactors={totpFactors}
            userEmail={user.email ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
