"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { Row } from "./setup-components";
import { SetupManager } from "./setup-manager";

export function SetupAdvancedSection({
  isEn,
  orgId,
  initialTab,
  initialOrganizations,
  properties,
  units,
  integrations,
  openAdvancedByDefault,
}: {
  isEn: boolean;
  orgId: string;
  initialTab?: string;
  initialOrganizations: Row[];
  properties: Row[];
  units: Row[];
  integrations: Row[];
  openAdvancedByDefault: boolean;
}) {
  return (
    <>
      <Separator />
      <Collapsible defaultOpen={openAdvancedByDefault}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl">
                  {isEn ? "Advanced onboarding" : "Onboarding avanzado"}
                </CardTitle>
                <CardDescription>
                  {isEn
                    ? "Full CRUD manager for organizations, properties, units, and channels."
                    : "Administrador CRUD completo para organizaciones, propiedades, unidades y canales."}
                </CardDescription>
              </div>
              <CollapsibleTrigger
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })
                )}
              >
                {isEn ? "Toggle advanced" : "Alternar avanzado"}
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <SetupManager
                initialTab={initialTab}
                integrations={integrations}
                organizations={initialOrganizations}
                orgId={orgId}
                properties={properties}
                units={units}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  );
}
