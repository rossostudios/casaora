export type ActionCenterSource =
  | "message"
  | "approval"
  | "notification"
  | "anomaly";

export type ActionCenterPriority = "critical" | "high" | "medium" | "low";

export type AIContextPayload = {
  source:
    | "portfolio"
    | "properties"
    | "units"
    | "listings"
    | "operations"
    | "reservations"
    | "leases"
    | "applications"
    | "knowledge"
    | "finance";
  entityIds: string[];
  filters: Record<string, string>;
  summary: string;
  returnPath: string;
  draftPrompt?: string;
  permissions?: {
    maySuggest: boolean;
    mayExecuteLowRisk: boolean;
    mayExecuteHighRisk: boolean;
  };
};

export type ActionCenterItem = {
  id: string;
  source: ActionCenterSource;
  priority: ActionCenterPriority;
  title: string;
  subtitle: string;
  entityLabel?: string;
  entityHref?: string;
  unread: boolean;
  createdAt: string;
  primaryAction: { label: string; href?: string; actionId?: string };
  secondaryAction?: { label: string; href?: string; actionId?: string };
};

export type WorkspaceMetric = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "success" | "warning";
};

export type WorkspaceQuickAction = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export type WorkspaceRecentActivity = {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  href?: string;
};

export type TodayWorkspaceData = {
  orgId: string;
  briefingTitle: string;
  briefingSummary: string;
  actionCenterItems: ActionCenterItem[];
  actionCenterCount: number;
  metrics: WorkspaceMetric[];
  quickActions: WorkspaceQuickAction[];
  recentActivity: WorkspaceRecentActivity[];
  onboarding: {
    completedSteps: number;
    totalSteps: number;
    percent: number;
  };
};
