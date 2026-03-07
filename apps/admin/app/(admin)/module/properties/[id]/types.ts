import type { PropertyHealthState } from "@/lib/features/properties/types";

export type TwinData = {
  health_score: number;
  occupancy_rate: number;
  avg_daily_rate: number;
  revenue_mtd: number;
  pending_maintenance: number;
  avg_review_score: number;
  guest_sentiment_score: number;
  risk_flags: Array<{
    type: string;
    severity: string;
    detail: string;
  }>;
  state_snapshot: Record<string, unknown>;
  refreshed_at: string;
  error?: string;
};

export type PropertyStatusTone = "occupied" | "maintenance" | "vacant";

export type PropertyUnitCard = {
  id: string;
  unitId: string;
  label: string;
  subtitle: string;
  statusTone: PropertyStatusTone;
  statusLabel: string;
  tenantName: string;
  monthlyRentPyg: number;
  nextCollectionDue: string | null;
  openTaskCount: number;
};

export type PropertyAttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "info";
  ctaLabel: string;
};

export type PropertyExpenseCategoryBreakdown = {
  category: string;
  amount: number;
};

export type LeaseExpiringSoon = {
  tenantName: string;
  unitLabel: string;
  daysLeft: number;
  leaseId: string;
};

export type PropertyOverview = {
  unitCount: number;
  activeLeaseCount: number;
  activeReservationCount: number;
  openTaskCount: number;
  publishedListingCount: number;
  pipelineApplicationCount: number;
  openCollectionCount: number;
  ownerStatementCount: number;
  occupancyRate: number | null;
  monthLabel: string;
  monthIncomePyg: number;
  monthExpensePyg: number;
  monthNetIncomePyg: number;
  projectedRentPyg: number;
  overdueCollectionCount: number;
  overdueCollectionAmountPyg: number;
  collectedThisMonthPyg: number;
  leasesExpiringSoon: LeaseExpiringSoon[];
  latestStatement: Record<string, unknown> | null;
  attentionItems: PropertyAttentionItem[];
  unitCards: PropertyUnitCard[];
  expenseCategoryBreakdown: PropertyExpenseCategoryBreakdown[];
  health: PropertyHealthState;
  urgentTaskCount: number;
  vacantUnitCount: number;
  vacancyCostPyg: number;
  collectionRate: number | null;
  totalExpenseCategoryCount: number;
};

export type PropertyRelatedLink = {
  href: string;
  label: string;
};

export type PropertyDetailPageData = {
  record: Record<string, unknown>;
  recordId: string;
  title: string;
  propertyCodeLabel: string | null;
  propertyLocationLabel: string;
  propertyType: string | null;
  overview: PropertyOverview | null;
  keys: string[];
  relatedLinks: PropertyRelatedLink[];
};

export type PropertyDetailLoadResult =
  | { kind: "not_found" }
  | {
      kind: "error";
      baseUrl: string;
      message: string;
      requestStatus: number | null;
      membershipError: boolean;
      orgId: string | null;
    }
  | {
      kind: "success";
      data: PropertyDetailPageData;
    };
