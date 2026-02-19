"use client";

import { Suspense } from "react";

import { ApplicationsBoard } from "@/app/(admin)/module/applications/applications-board";
import { ApplicationsCharts } from "@/app/(admin)/module/applications/applications-charts";
import { ApplicationsFilters } from "@/app/(admin)/module/applications/applications-filters";
import { ApplicationsSlaAlerts } from "@/app/(admin)/module/applications/applications-sla-alerts";
import { ApplicationsStats } from "@/app/(admin)/module/applications/applications-stats";
import { ApplicationsTable } from "@/app/(admin)/module/applications/applications-table";
import { useApplicationsData } from "@/app/(admin)/module/applications/use-applications-data";

export function ApplicationsManager({
  applications,
  members,
  messageTemplates,
}: {
  applications: Record<string, unknown>[];
  members: Record<string, unknown>[];
  messageTemplates: Record<string, unknown>[];
}) {
  return (
    <Suspense fallback={null}>
      <ApplicationsManagerInner
        applications={applications}
        members={members}
        messageTemplates={messageTemplates}
      />
    </Suspense>
  );
}

function ApplicationsManagerInner({
  applications,
  members,
  messageTemplates,
}: {
  applications: Record<string, unknown>[];
  members: Record<string, unknown>[];
  messageTemplates: Record<string, unknown>[];
}) {
  const {
    locale,
    isEn,
    nextPath,
    today,
    assignmentOptions,
    templateOptions,
    filteredRows,
    queueOptimisticRowUpdate,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    slaFilter,
    setSlaFilter,
    qualificationFilter,
    setQualificationFilter,
    statusFilterOptions,
    assigneeFilterOptions,
    slaFilterOptions,
    qualificationFilterOptions,
    metrics,
    funnelChartData,
    funnelChartConfig,
    responseTrendData,
    responseTrendConfig,
    boardRowsByLane,
    slaAlertRows,
  } = useApplicationsData({ applications, members, messageTemplates });

  return (
    <div className="space-y-5">
      <ApplicationsStats isEn={isEn} metrics={metrics} />

      <ApplicationsCharts
        funnelChartConfig={funnelChartConfig}
        funnelChartData={funnelChartData}
        isEn={isEn}
        responseTrendConfig={responseTrendConfig}
        responseTrendData={responseTrendData}
      />

      <ApplicationsFilters
        assigneeFilter={assigneeFilter}
        assigneeFilterOptions={assigneeFilterOptions}
        isEn={isEn}
        qualificationFilter={qualificationFilter}
        qualificationFilterOptions={qualificationFilterOptions}
        setAssigneeFilter={setAssigneeFilter}
        setQualificationFilter={setQualificationFilter}
        setSlaFilter={setSlaFilter}
        setStatusFilter={setStatusFilter}
        slaFilter={slaFilter}
        slaFilterOptions={slaFilterOptions}
        statusFilter={statusFilter}
        statusFilterOptions={statusFilterOptions}
      />

      <ApplicationsSlaAlerts
        isEn={isEn}
        locale={locale}
        slaAlertRows={slaAlertRows}
      />

      <ApplicationsBoard
        assignmentOptions={assignmentOptions}
        boardRowsByLane={boardRowsByLane}
        isEn={isEn}
        locale={locale}
        nextPath={nextPath}
        queueOptimisticRowUpdate={queueOptimisticRowUpdate}
        templateOptions={templateOptions}
      />

      <ApplicationsTable
        filteredRows={filteredRows}
        isEn={isEn}
        locale={locale}
        nextPath={nextPath}
        queueOptimisticRowUpdate={queueOptimisticRowUpdate}
        templateOptions={templateOptions}
        today={today}
      />
    </div>
  );
}
