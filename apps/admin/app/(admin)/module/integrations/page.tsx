import { Suspense } from "react";

import { OrgAccessChanged } from "@/components/shell/org-access-changed";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchList } from "@/lib/api";
import { errorMessage, isOrgMembershipError } from "@/lib/errors";
import { getActiveLocale } from "@/lib/i18n/server";
import { getActiveOrgId } from "@/lib/org";

import { IntegrationsManager } from "./integrations-manager";
import { IotDashboard } from "./iot-dashboard";

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function IntegrationsModulePage({
  searchParams,
}: PageProps) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";
  const orgId = await getActiveOrgId();
  const { success, error } = await searchParams;

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isEn ? "Missing organization" : "Falta organización"}
          </CardTitle>
          <CardDescription>
            {isEn
              ? "Select an organization to manage channels."
              : "Selecciona una organización para gestionar canales."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  let integrations: Record<string, unknown>[] = [];
  let units: Record<string, unknown>[] = [];
  let events: Record<string, unknown>[] = [];
  let iotDevices: Record<string, unknown>[] = [];
  let iotEvents: Record<string, unknown>[] = [];
  let accessCodes: Record<string, unknown>[] = [];
  try {
    [integrations, units, events, iotDevices, iotEvents, accessCodes] =
      await Promise.all([
        fetchList("/integrations", orgId, 200) as Promise<
          Record<string, unknown>[]
        >,
        fetchList("/units", orgId, 500) as Promise<Record<string, unknown>[]>,
        fetchList("/integration-events", orgId, 100) as Promise<
          Record<string, unknown>[]
        >,
        fetchList("/iot-devices", orgId, 100).catch(() => []) as Promise<
          Record<string, unknown>[]
        >,
        fetchList("/iot-events", orgId, 200).catch(() => []) as Promise<
          Record<string, unknown>[]
        >,
        fetchList("/access-codes", orgId, 100).catch(() => []) as Promise<
          Record<string, unknown>[]
        >,
      ]);
  } catch (err) {
    if (isOrgMembershipError(errorMessage(err)))
      return <OrgAccessChanged orgId={orgId} />;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isEn ? "Channels" : "Canales"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {isEn ? "Failed to load channels." : "Error al cargar canales."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEn ? "Channels" : "Canales"}</CardTitle>
          <CardDescription>
            {isEn
              ? "Connect units to OTA and direct-sales channels with iCal sync."
              : "Conecta unidades a canales OTA y de venta directa con sync iCal."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4">
              <AlertDescription>
                {success.replaceAll("-", " ")}
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <IntegrationsManager
            events={events}
            integrations={integrations}
            locale={locale}
            orgId={orgId}
            units={units}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">IoT</Badge>
            <CardTitle className="text-lg">
              {isEn
                ? "Smart Devices & Access Codes"
                : "Dispositivos Inteligentes y Códigos de Acceso"}
            </CardTitle>
          </div>
          <CardDescription>
            {isEn
              ? "Manage smart locks, sensors, and time-limited access codes for guests and tenants."
              : "Gestiona cerraduras inteligentes, sensores y códigos de acceso temporales para huéspedes e inquilinos."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <IotDashboard
              codes={accessCodes}
              devices={iotDevices}
              events={iotEvents}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
