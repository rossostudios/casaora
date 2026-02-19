"use client";

import { DataImportSheet } from "@/components/import/data-import-sheet";

import type { SelectOption } from "./setup-types";

export function SetupImportSheets({
  isEn,
  orgId,
  propertyOptions,
  unitOptions,
  importPropertyOpen,
  importUnitOpen,
  importLeaseOpen,
  onImportPropertyOpenChange,
  onImportUnitOpenChange,
  onImportLeaseOpenChange,
  onImportComplete,
}: {
  isEn: boolean;
  orgId: string;
  propertyOptions: SelectOption[];
  unitOptions: SelectOption[];
  importPropertyOpen: boolean;
  importUnitOpen: boolean;
  importLeaseOpen: boolean;
  onImportPropertyOpenChange: (open: boolean) => void;
  onImportUnitOpenChange: (open: boolean) => void;
  onImportLeaseOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}) {
  return (
    <>
      <DataImportSheet
        isEn={isEn}
        mode="properties"
        onImportComplete={onImportComplete}
        onOpenChange={onImportPropertyOpenChange}
        open={importPropertyOpen}
        orgId={orgId}
      />
      <DataImportSheet
        isEn={isEn}
        mode="units"
        onImportComplete={onImportComplete}
        onOpenChange={onImportUnitOpenChange}
        open={importUnitOpen}
        orgId={orgId}
        properties={propertyOptions.map((p) => ({
          id: p.id,
          name: p.label,
        }))}
      />
      <DataImportSheet
        isEn={isEn}
        mode="leases"
        onImportComplete={onImportComplete}
        onOpenChange={onImportLeaseOpenChange}
        open={importLeaseOpen}
        orgId={orgId}
        units={unitOptions.map((u) => ({ id: u.id, name: u.label }))}
      />
    </>
  );
}
