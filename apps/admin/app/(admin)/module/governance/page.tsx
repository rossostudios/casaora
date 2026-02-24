import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import GovernanceManager from "./governance-manager";

export default async function GovernancePage() {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const orgId = await getActiveOrgId();

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isEn
              ? "Missing organization context"
              : "Falta contexto de organización"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Select an organization to access governance controls."
              : "Selecciona una organización para acceder a los controles de gobernanza."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {isEn
            ? "Use the organization switcher in the top bar."
            : "Usa el selector de organización en la barra superior."}
        </CardContent>
      </Card>
    );
  }

  return <GovernanceManager locale={locale} orgId={orgId} />;
}
