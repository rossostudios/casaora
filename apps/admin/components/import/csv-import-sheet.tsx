"use client";

import { Upload01Icon } from "@hugeicons/core-free-icons";
import Papa from "papaparse";
import { useCallback, useMemo, useState } from "react";

import {
  batchCreateProperties,
  batchCreateUnits,
  type ImportRowResult,
} from "@/app/(admin)/setup/import-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import {
  autoDetectMappings,
  ColumnMapper,
  PROPERTY_FIELDS,
  UNIT_FIELDS,
} from "./column-mapper";
import { ImportProgress } from "./import-progress";

type ImportMode = "properties" | "units";

type CsvImportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ImportMode;
  orgId: string;
  isEn: boolean;
  /** For unit imports: resolve property_name to property_id */
  properties?: Array<{ id: string; name: string; code?: string }>;
  onImportComplete?: () => void;
};

type CsvRow = Record<string, string>;

type MappingEntry = { csvHeader: string; targetField: string };

function resolvePropertyId(
  value: string,
  properties: Array<{ id: string; name: string; code?: string }>
): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  for (const p of properties) {
    if (p.name.toLowerCase() === normalized) return p.id;
    if (p.code && p.code.toLowerCase() === normalized) return p.id;
    if (p.id === value.trim()) return p.id;
  }
  return null;
}

export function CsvImportSheet({
  open,
  onOpenChange,
  mode,
  orgId,
  isEn,
  properties = [],
  onImportComplete,
}: CsvImportSheetProps) {
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<MappingEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportRowResult[]>([]);
  const [importProcessed, setImportProcessed] = useState(0);
  const [importDone, setImportDone] = useState(false);

  const targetFields = mode === "properties" ? PROPERTY_FIELDS : UNIT_FIELDS;
  const templateUrl =
    mode === "properties"
      ? "/templates/properties-template.csv"
      : "/templates/units-template.csv";

  const reset = useCallback(() => {
    setCsvData([]);
    setCsvHeaders([]);
    setMappings([]);
    setFileName("");
    setParseError("");
    setImporting(false);
    setImportResults([]);
    setImportProcessed(0);
    setImportDone(false);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setParseError("");
      setImportDone(false);
      setImportResults([]);
      setImportProcessed(0);

      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            setParseError(result.errors[0].message);
            return;
          }
          if (result.data.length === 0) {
            setParseError(isEn ? "File is empty" : "El archivo está vacío");
            return;
          }
          const headers = result.meta.fields ?? Object.keys(result.data[0]);
          setCsvHeaders(headers);
          setCsvData(result.data);
          setFileName(file.name);
          setMappings(autoDetectMappings(headers, targetFields));
        },
        error: (err) => {
          setParseError(err.message);
        },
      });
    },
    [isEn, targetFields]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const requiredFields = targetFields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!mappings.some((m) => m.targetField === field.key)) {
        errors.push(
          isEn
            ? `Required field "${field.label}" is not mapped`
            : `Campo requerido "${field.label}" no está mapeado`
        );
      }
    }
    return errors;
  }, [mappings, targetFields, isEn]);

  const handleImport = async () => {
    if (validationErrors.length > 0 || importing) return;
    setImporting(true);
    setImportResults([]);
    setImportProcessed(0);
    setImportDone(false);

    // Build mapped rows
    const mappedRows = csvData.map((csvRow) => {
      const mapped: Record<string, string> = {};
      for (const m of mappings) {
        if (m.targetField) {
          mapped[m.targetField] = csvRow[m.csvHeader] ?? "";
        }
      }
      return mapped;
    });

    if (mode === "properties") {
      const propertyPayloads = mappedRows.map((row) => ({
        name: row.name ?? "",
        code: row.code,
        address_line1: row.address_line1,
        city: row.city,
      }));
      const result = await batchCreateProperties(orgId, propertyPayloads);
      setImportResults(result.rows);
      setImportProcessed(result.total);
      setImportDone(true);
    } else {
      const unitPayloads = mappedRows.map((row) => {
        const propertyName = row.property_name ?? "";
        const propertyId = resolvePropertyId(propertyName, properties);
        return {
          property_id: propertyId ?? "",
          code: row.code ?? "",
          name: row.name ?? "",
          max_guests: row.max_guests ? Number(row.max_guests) : undefined,
          bedrooms: row.bedrooms ? Number(row.bedrooms) : undefined,
          bathrooms: row.bathrooms ? Number(row.bathrooms) : undefined,
        };
      });
      const result = await batchCreateUnits(orgId, unitPayloads);
      setImportResults(result.rows);
      setImportProcessed(result.total);
      setImportDone(true);
    }

    setImporting(false);
    onImportComplete?.();
  };

  const previewRows = csvData.slice(0, 5);

  return (
    <Sheet
      description={
        mode === "properties"
          ? isEn
            ? "Import properties from a CSV or Excel file."
            : "Importar propiedades desde un archivo CSV o Excel."
          : isEn
            ? "Import units from a CSV or Excel file."
            : "Importar unidades desde un archivo CSV o Excel."
      }
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      open={open}
      title={
        mode === "properties"
          ? isEn
            ? "Import properties"
            : "Importar propiedades"
          : isEn
            ? "Import units"
            : "Importar unidades"
      }
    >
      <div className="space-y-5">
        {/* Download template */}
        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {isEn ? "Download CSV template" : "Descargar plantilla CSV"}
          </span>
          <a
            className="text-sm font-medium text-primary hover:underline"
            download
            href={templateUrl}
          >
            {isEn ? "Download" : "Descargar"}
          </a>
        </div>

        {/* File drop zone */}
        {csvData.length === 0 && !importDone ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/70 bg-muted/10 px-4 py-10 text-center transition-colors hover:border-primary/30 hover:bg-muted/20"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <Icon className="text-muted-foreground" icon={Upload01Icon} size={32} />
            <div>
              <p className="text-sm font-medium text-foreground">
                {isEn
                  ? "Drop your CSV file here"
                  : "Suelta tu archivo CSV aquí"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isEn ? "or click to select" : "o haz clic para seleccionar"}
              </p>
            </div>
            <label className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/50">
              {isEn ? "Select file" : "Seleccionar archivo"}
              <input
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={onFileSelect}
                type="file"
              />
            </label>
          </div>
        ) : null}

        {parseError ? (
          <Alert variant="destructive">
            <AlertTitle>{isEn ? "Parse error" : "Error de lectura"}</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        ) : null}

        {/* Column mapper */}
        {csvHeaders.length > 0 && !importDone ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">
                {csvData.length} {isEn ? "rows" : "filas"}
              </span>
            </div>

            <ColumnMapper
              csvHeaders={csvHeaders}
              isEn={isEn}
              mappings={mappings}
              onMappingChange={setMappings}
              targetFields={targetFields}
            />

            {validationErrors.length > 0 ? (
              <Alert variant="warning">
                <AlertTitle>
                  {isEn ? "Mapping issues" : "Problemas de mapeo"}
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {validationErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Preview table */}
            {previewRows.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {isEn ? "Preview (first 5 rows)" : "Vista previa (primeras 5 filas)"}
                </p>
                <div className="max-h-48 overflow-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {csvHeaders.map((h) => (
                          <th
                            className="px-2 py-1.5 text-left font-medium text-muted-foreground"
                            key={h}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr className="border-b" key={i}>
                          {csvHeaders.map((h) => (
                            <td className="px-2 py-1.5" key={h}>
                              {row[h] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                onClick={reset}
                type="button"
                variant="outline"
              >
                {isEn ? "Cancel" : "Cancelar"}
              </Button>
              <Button
                disabled={importing || validationErrors.length > 0}
                onClick={handleImport}
                type="button"
              >
                {importing ? (
                  <>
                    <Spinner size="sm" className="text-primary-foreground" />
                    {isEn ? "Importing..." : "Importando..."}
                  </>
                ) : (
                  <>
                    {isEn ? "Import" : "Importar"} {csvData.length}{" "}
                    {isEn ? "rows" : "filas"}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : null}

        {/* Import progress */}
        {importDone ? (
          <>
            <ImportProgress
              isEn={isEn}
              processed={importProcessed}
              results={importResults}
              total={csvData.length}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={reset}
                type="button"
                variant="outline"
              >
                {isEn ? "Import more" : "Importar más"}
              </Button>
              <Button
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
                type="button"
              >
                {isEn ? "Done" : "Listo"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
