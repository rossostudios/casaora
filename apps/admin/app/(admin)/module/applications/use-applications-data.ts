"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useOptimistic, useState } from "react";

import type { ComboboxOption } from "@/components/ui/combobox";
import type {
  ApplicationRow,
  MessageTemplateOption,
} from "@/lib/features/applications/types";
import {
  asBoolean,
  asNumber,
  asString,
  normalizeSlaStatus,
  qualificationBandLabel,
  statusLabel,
} from "@/lib/features/applications/utils";
import { useActiveLocale } from "@/lib/i18n/client";
import { useApplicationsDerived } from "./use-applications-derived";

export type OptimisticAction =
  | {
      type: "set-status";
      applicationId: string;
      nextStatus: string;
    }
  | {
      type: "assign";
      applicationId: string;
      assignedUserId: string | null;
      assignedUserName: string | null;
    };

export function useApplicationsData({
  applications,
  members,
  messageTemplates,
}: {
  applications: Record<string, unknown>[];
  members: Record<string, unknown>[];
  messageTemplates: Record<string, unknown>[];
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const suffix = searchParams.toString();
    return suffix ? `${pathname}?${suffix}` : pathname;
  }, [pathname, searchParams]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const memberOptions = useMemo<ComboboxOption[]>(() => {
    const index = new Map<string, ComboboxOption>();

    for (const member of members) {
      const userId = asString(member.user_id).trim();
      if (!userId) continue;

      const role = asString(member.role).trim();
      const appUserValue = member.app_users;
      const appUser = Array.isArray(appUserValue)
        ? ((appUserValue[0] as Record<string, unknown> | undefined) ?? null)
        : appUserValue && typeof appUserValue === "object"
          ? (appUserValue as Record<string, unknown>)
          : null;

      const fullName = appUser ? asString(appUser.full_name).trim() : "";
      const email = appUser ? asString(appUser.email).trim() : "";
      const baseLabel = fullName || email || userId;

      const label = role ? `${baseLabel} · ${role}` : baseLabel;
      index.set(userId, { value: userId, label });
    }

    return [...index.values()].sort((left, right) =>
      left.label.localeCompare(right.label)
    );
  }, [members]);

  const assignmentOptions = useMemo<ComboboxOption[]>(() => {
    return [
      {
        value: "__unassigned__",
        label: isEn ? "Unassigned" : "Sin asignar",
      },
      ...memberOptions,
    ];
  }, [isEn, memberOptions]);

  const templateOptions = useMemo<MessageTemplateOption[]>(() => {
    return messageTemplates
      .map((template) => ({
        id: asString(template.id).trim(),
        channel: asString(template.channel).trim().toLowerCase(),
        template_key: asString(template.template_key).trim(),
        name: asString(template.name).trim(),
        subject: asString(template.subject),
        body: asString(template.body),
        is_active:
          template.is_active === undefined
            ? true
            : asBoolean(template.is_active),
      }))
      .filter((template) => template.id && template.channel && template.body);
  }, [messageTemplates]);

  const rows = useMemo<ApplicationRow[]>(() => {
    return applications.map((application) => {
      const status = asString(application.status).trim();
      return {
        id: asString(application.id).trim(),
        full_name: asString(application.full_name).trim(),
        email: asString(application.email).trim(),
        phone_e164: asString(application.phone_e164).trim() || null,
        status,
        status_label: statusLabel(status, isEn),
        listing_title: asString(application.listing_title).trim(),
        monthly_income: asNumber(application.monthly_income),
        first_response_minutes: asNumber(application.first_response_minutes),
        created_at: asString(application.created_at).trim(),
        assigned_user_id: asString(application.assigned_user_id).trim() || null,
        assigned_user_name:
          asString(application.assigned_user_name).trim() || null,
        response_sla_status: asString(application.response_sla_status).trim(),
        response_sla_alert_level: asString(
          application.response_sla_alert_level
        ).trim(),
        response_sla_due_at:
          asString(application.response_sla_due_at).trim() || null,
        response_sla_remaining_minutes: asNumber(
          application.response_sla_remaining_minutes
        ),
        qualification_score: asNumber(application.qualification_score),
        qualification_band: asString(application.qualification_band).trim(),
        income_to_rent_ratio:
          asNumber(application.income_to_rent_ratio) > 0
            ? asNumber(application.income_to_rent_ratio)
            : null,
      } satisfies ApplicationRow;
    });
  }, [applications, isEn]);

  const [optimisticRows, queueOptimisticRowUpdate] = useOptimistic(
    rows,
    (currentRows, action: OptimisticAction) => {
      return currentRows.map((row) => {
        if (row.id !== action.applicationId) return row;
        if (action.type === "assign") {
          return {
            ...row,
            assigned_user_id: action.assignedUserId,
            assigned_user_name: action.assignedUserName,
          };
        }
        return {
          ...row,
          status: action.nextStatus,
          status_label: statusLabel(action.nextStatus, isEn),
        };
      });
    }
  );

  const [statusFilter, setStatusFilter] = useState("__all__");
  const [assigneeFilter, setAssigneeFilter] = useState("__all__");
  const [slaFilter, setSlaFilter] = useState("__all__");
  const [qualificationFilter, setQualificationFilter] = useState("__all__");

  const statusFilterOptions = useMemo<ComboboxOption[]>(() => {
    const uniqueStatuses = [
      ...new Set(optimisticRows.map((row) => row.status.trim())),
    ]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));

    return [
      {
        value: "__all__",
        label: isEn ? "All statuses" : "Todos los estados",
      },
      ...uniqueStatuses.map((status) => ({
        value: status,
        label: statusLabel(status, isEn),
      })),
    ];
  }, [isEn, optimisticRows]);

  const assigneeFilterOptions = useMemo<ComboboxOption[]>(() => {
    return [
      {
        value: "__all__",
        label: isEn ? "All assignees" : "Todos los responsables",
      },
      ...assignmentOptions,
    ];
  }, [assignmentOptions, isEn]);

  const slaFilterOptions = useMemo<ComboboxOption[]>(() => {
    return [
      {
        value: "__all__",
        label: isEn ? "All SLA levels" : "Todos los niveles SLA",
      },
      { value: "normal", label: isEn ? "Normal" : "Normal" },
      { value: "warning", label: isEn ? "Warning" : "Advertencia" },
      { value: "critical", label: isEn ? "Critical" : "Crítico" },
      { value: "breached", label: isEn ? "Breached" : "Vencido" },
    ];
  }, [isEn]);

  const qualificationFilterOptions = useMemo<ComboboxOption[]>(() => {
    return [
      {
        value: "__all__",
        label: isEn ? "All qualification bands" : "Todas las bandas",
      },
      { value: "strong", label: qualificationBandLabel("strong", isEn) },
      { value: "moderate", label: qualificationBandLabel("moderate", isEn) },
      { value: "watch", label: qualificationBandLabel("watch", isEn) },
    ];
  }, [isEn]);

  const filteredRows = useMemo(() => {
    return optimisticRows.filter((row) => {
      const normalizedStatus = row.status.trim().toLowerCase();
      const normalizedBand = row.qualification_band.trim().toLowerCase();
      const normalizedSlaLevel = row.response_sla_alert_level
        .trim()
        .toLowerCase();
      const normalizedSlaStatus = normalizeSlaStatus(row);

      if (statusFilter !== "__all__" && normalizedStatus !== statusFilter)
        return false;
      if (assigneeFilter === "__unassigned__" && row.assigned_user_id)
        return false;
      if (
        assigneeFilter !== "__all__" &&
        assigneeFilter !== "__unassigned__" &&
        row.assigned_user_id !== assigneeFilter
      )
        return false;
      if (slaFilter === "breached" && normalizedSlaStatus !== "breached")
        return false;
      if (
        slaFilter !== "__all__" &&
        slaFilter !== "breached" &&
        normalizedSlaLevel !== slaFilter
      )
        return false;
      if (
        qualificationFilter !== "__all__" &&
        normalizedBand !== qualificationFilter
      )
        return false;

      return true;
    });
  }, [
    assigneeFilter,
    optimisticRows,
    qualificationFilter,
    slaFilter,
    statusFilter,
  ]);

  const derived = useApplicationsDerived({ filteredRows, isEn, locale });

  return {
    locale,
    isEn,
    nextPath,
    today,
    assignmentOptions,
    templateOptions,
    filteredRows,
    optimisticRows,
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
    ...derived,
  };
}
