import type { PropertyOverview as PropertyOverviewData } from "../types";
import { PropertyActivityTimeline } from "./property-activity-timeline";
import { PropertyAiInsight } from "./property-ai-insight";
import { PropertyOverviewFinancial } from "./property-overview-financial";
import { PropertyOverviewKpiCards } from "./property-overview-kpi-cards";
import { PropertyOverviewOperations } from "./property-overview-operations";

type PropertyOverviewProps = {
  overview: PropertyOverviewData;
  recordId: string;
  locale: "en-US" | "es-PY";
  isEn: boolean;
  orgId?: string;
  propertyId?: string;
  propertyName?: string;
};

export function PropertyOverview({
  overview,
  recordId,
  locale,
  isEn,
  orgId,
  propertyId,
  propertyName,
}: PropertyOverviewProps) {
  const resolvedPropertyId = propertyId ?? recordId;

  return (
    <div className="space-y-6">
      {/* AI Insight — full width */}
      {orgId && propertyName && (
        <PropertyAiInsight
          isEn={isEn}
          locale={locale}
          orgId={orgId}
          overview={overview}
          propertyId={resolvedPropertyId}
          propertyName={propertyName}
        />
      )}

      {/* Split KPIs — full width */}
      <PropertyOverviewKpiCards
        isEn={isEn}
        locale={locale}
        overview={overview}
      />

      {/* Two-column: Main + Right Panel */}
      <div className="flex gap-0">
        <div className="min-w-0 flex-1 space-y-6">
          <PropertyOverviewOperations
            isEn={isEn}
            locale={locale}
            overview={overview}
            recordId={recordId}
          />
          {orgId && (
            <PropertyActivityTimeline
              isEn={isEn}
              orgId={orgId}
              propertyId={resolvedPropertyId}
            />
          )}
        </div>
        <div className="mx-6 hidden w-px self-stretch bg-border/20 xl:block" />
        <div className="hidden w-[340px] shrink-0 space-y-6 xl:block">
          <PropertyOverviewFinancial
            isEn={isEn}
            locale={locale}
            overview={overview}
            recordId={recordId}
          />
        </div>
      </div>

      {/* Mobile-only: Financial below */}
      <div className="xl:hidden">
        <PropertyOverviewFinancial
          isEn={isEn}
          locale={locale}
          overview={overview}
          recordId={recordId}
        />
      </div>
    </div>
  );
}
