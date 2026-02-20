"use client";

import { Edit02Icon } from "@hugeicons/core-free-icons";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";

import {
  acceptRenewalAction,
  sendRenewalOfferAction,
  setLeaseStatusAction,
} from "@/app/(admin)/module/leases/actions";
import {
  generateLeaseContractPdf,
  type LeaseContractData,
} from "@/components/reports/lease-contract-pdf";
import { Button, buttonVariants } from "@/components/ui/button";
import type { DataTableRow } from "@/components/ui/data-table";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { NotionDataTable } from "@/components/ui/notion-data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  asNumber,
  asString,
  canActivate,
  canComplete,
  canRenew,
  canTerminate,
  type LeaseRow,
} from "./lease-types";

export function LeasesTable({
  rows,
  isEn,
  locale,
  nextPath,
  units,
  properties,
  onEdit,
  onGenerate,
  onRenew,
  queueOptimisticRowUpdate,
}: {
  rows: DataTableRow[];
  isEn: boolean;
  locale: string;
  nextPath: string;
  units: Record<string, unknown>[];
  properties: Record<string, unknown>[];
  onEdit: (row: LeaseRow) => void;
  onGenerate: (row: LeaseRow) => void;
  onRenew: (row: LeaseRow) => void;
  queueOptimisticRowUpdate: (action: {
    type: "set-status";
    leaseId: string;
    nextStatus: string;
  }) => void;
}) {
  const columns = useMemo<ColumnDef<DataTableRow>[]>(() => {
    return [
      {
        accessorKey: "tenant_full_name",
        header: isEn ? "Tenant" : "Inquilino",
        cell: ({ row, getValue }) => {
          const name = asString(getValue());
          const email = asString(row.original.tenant_email).trim();
          const phone = asString(row.original.tenant_phone_e164).trim();
          return (
            <div className="space-y-1">
              <p className="font-medium">{name}</p>
              {email ? (
                <p className="text-muted-foreground text-xs">{email}</p>
              ) : null}
              {phone ? (
                <p className="text-muted-foreground text-xs">{phone}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "lease_status_label",
        header: isEn ? "Status" : "Estado",
        cell: ({ row, getValue }) => (
          <StatusBadge
            label={asString(getValue())}
            value={asString(row.original.lease_status)}
          />
        ),
      },
      {
        accessorKey: "property_name",
        header: isEn ? "Property / Unit" : "Propiedad / Unidad",
        cell: ({ row }) => {
          const property = asString(row.original.property_name).trim();
          const unit = asString(row.original.unit_name).trim();
          return (
            <p className="text-sm">
              {[property, unit].filter(Boolean).join(" · ") || "-"}
            </p>
          );
        },
      },
      {
        accessorKey: "starts_on",
        header: isEn ? "Start" : "Inicio",
      },
      {
        accessorKey: "monthly_recurring_total",
        header: isEn ? "Monthly recurring" : "Mensual recurrente",
        cell: ({ row, getValue }) =>
          formatCurrency(
            asNumber(getValue()),
            asString(row.original.currency),
            locale
          ),
      },
      {
        accessorKey: "collection_paid_count",
        header: isEn ? "Collections paid" : "Cobros pagados",
        cell: ({ row, getValue }) => {
          const paid = asNumber(getValue());
          const total = asNumber(row.original.collection_count);
          return `${paid}/${total}`;
        },
      },
    ];
  }, [isEn, locale]);

  return (
    <NotionDataTable
      columns={columns}
      data={rows}
      hideSearch
      isEn={isEn}
      renderRowActions={(row) => (
        <LeaseRowActions
          isEn={isEn}
          nextPath={nextPath}
          onEdit={onEdit}
          onGenerate={onGenerate}
          onRenew={onRenew}
          properties={properties}
          queueOptimisticRowUpdate={queueOptimisticRowUpdate}
          row={row}
          units={units}
        />
      )}
    />
  );
}

function LeaseRowActions({
  row,
  isEn,
  nextPath,
  units,
  properties,
  onEdit,
  onGenerate,
  onRenew,
  queueOptimisticRowUpdate,
}: {
  row: DataTableRow;
  isEn: boolean;
  nextPath: string;
  units: Record<string, unknown>[];
  properties: Record<string, unknown>[];
  onEdit: (row: LeaseRow) => void;
  onGenerate: (row: LeaseRow) => void;
  onRenew: (row: LeaseRow) => void;
  queueOptimisticRowUpdate: (action: {
    type: "set-status";
    leaseId: string;
    nextStatus: string;
  }) => void;
}) {
  const id = asString(row.id);
  const status = asString(row.lease_status);
  const leaseRow = row as unknown as LeaseRow;

  const handleDownloadContract = async () => {
    const unitId = asString(row.unit_id);
    const unit = units.find((u) => asString(u.id) === unitId);
    const propId = asString(unit?.property_id ?? row.property_id);
    const prop = properties.find((p) => asString(p.id) === propId);

    const contractData: LeaseContractData = {
      tenantName: asString(row.tenant_full_name),
      tenantEmail: asString(row.tenant_email),
      tenantPhone: asString(row.tenant_phone_e164),
      propertyName: asString(prop?.name),
      unitName: asString(unit?.name ?? unit?.code),
      startsOn: asString(row.starts_on),
      endsOn: asString(row.ends_on),
      monthlyRent: asNumber(row.monthly_rent),
      serviceFee: asNumber(row.service_fee_flat),
      securityDeposit: asNumber(row.security_deposit),
      guaranteeFee: asNumber(row.guarantee_option_fee),
      taxIva: asNumber(row.tax_iva),
      totalMoveIn: asNumber(row.total_move_in),
      monthlyTotal: asNumber(row.monthly_recurring_total),
      currency: asString(row.currency) || "PYG",
      notes: asString(row.notes),
      orgName: "Casaora",
    };
    await generateLeaseContractPdf(contractData, isEn);
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button onClick={() => onEdit(leaseRow)} size="sm" variant="ghost">
        <Icon icon={Edit02Icon} size={14} />
        {isEn ? "Edit" : "Editar"}
      </Button>
      <Button onClick={handleDownloadContract} size="sm" variant="ghost">
        {isEn ? "Contract" : "Contrato"}
      </Button>
      <Link
        className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
        href="/module/collections"
      >
        {isEn ? "Collections" : "Cobros"}
      </Link>
      <Button onClick={() => onGenerate(leaseRow)} size="sm" variant="ghost">
        {isEn ? "Generate" : "Generar"}
      </Button>

      {canRenew(status) && !leaseRow.renewal_status ? (
        <Button onClick={() => onRenew(leaseRow)} size="sm" variant="ghost">
          {isEn ? "Renew" : "Renovar"}
        </Button>
      ) : null}

      {canRenew(status) && !leaseRow.renewal_status ? (
        <Form action={sendRenewalOfferAction}>
          <input name="lease_id" type="hidden" value={id} />
          <input name="next" type="hidden" value={nextPath} />
          <Button size="sm" type="submit" variant="outline">
            {isEn ? "Send Offer" : "Enviar Oferta"}
          </Button>
        </Form>
      ) : null}

      {leaseRow.renewal_status === "offered" ||
      leaseRow.renewal_status === "pending" ? (
        <Form action={acceptRenewalAction}>
          <input name="lease_id" type="hidden" value={id} />
          <input name="next" type="hidden" value={nextPath} />
          <Button size="sm" type="submit" variant="secondary">
            {isEn ? "Accept Renewal" : "Aceptar Renovacion"}
          </Button>
        </Form>
      ) : null}

      {canActivate(status) ? (
        <Form
          action={setLeaseStatusAction}
          onSubmit={() =>
            queueOptimisticRowUpdate({
              type: "set-status",
              leaseId: id,
              nextStatus: "active",
            })
          }
        >
          <input name="lease_id" type="hidden" value={id} />
          <input name="lease_status" type="hidden" value="active" />
          <input name="next" type="hidden" value={nextPath} />
          <Button size="sm" type="submit" variant="outline">
            {isEn ? "Activate" : "Activar"}
          </Button>
        </Form>
      ) : null}

      {canTerminate(status) ? (
        <Form
          action={setLeaseStatusAction}
          onSubmit={() =>
            queueOptimisticRowUpdate({
              type: "set-status",
              leaseId: id,
              nextStatus: "terminated",
            })
          }
        >
          <input name="lease_id" type="hidden" value={id} />
          <input name="lease_status" type="hidden" value="terminated" />
          <input name="next" type="hidden" value={nextPath} />
          <Button size="sm" type="submit" variant="outline">
            {isEn ? "Terminate" : "Terminar"}
          </Button>
        </Form>
      ) : null}

      {canComplete(status) ? (
        <Form
          action={setLeaseStatusAction}
          onSubmit={() =>
            queueOptimisticRowUpdate({
              type: "set-status",
              leaseId: id,
              nextStatus: "completed",
            })
          }
        >
          <input name="lease_id" type="hidden" value={id} />
          <input name="lease_status" type="hidden" value="completed" />
          <input name="next" type="hidden" value={nextPath} />
          <Button size="sm" type="submit" variant="secondary">
            {isEn ? "Complete" : "Completar"}
          </Button>
        </Form>
      ) : null}
    </div>
  );
}
