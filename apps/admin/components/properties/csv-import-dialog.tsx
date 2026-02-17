"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useActiveLocale } from "@/lib/i18n/client";

type CsvRow = Record<string, string>;
type ImportStatus = "idle" | "parsing" | "importing" | "done";

type ImportResult = {
  total: number;
  succeeded: number;
  failed: number;
  rows: Array<{ index: number; ok: boolean; error?: string }>;
};

const EXPECTED_COLUMNS = [
  "name",
  "code",
  "address_line1",
  "city",
  "country_code",
];

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: CsvRow = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

export function CsvImportDialog({
  orgId,
  onComplete,
}: {
  orgId: string;
  onComplete?: () => void;
}) {
  const locale = useActiveLocale();
  const isEn = locale === "en-US";

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setStatus("parsing");
      setError("");
      setResult(null);

      try {
        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length === 0) {
          setError(
            isEn
              ? "No data rows found. Ensure CSV has a header row and at least one data row."
              : "No se encontraron filas. Asegúrate de que el CSV tiene un encabezado y al menos una fila de datos."
          );
          setStatus("idle");
          return;
        }

        const firstRow = rows[0];
        if (!("name" in firstRow)) {
          setError(
            isEn
              ? 'Missing required column "name". Found: ' +
                Object.keys(firstRow).join(", ")
              : 'Falta columna requerida "name". Encontradas: ' +
                Object.keys(firstRow).join(", ")
          );
          setStatus("idle");
          return;
        }

        setParsedRows(rows);
        setStatus("idle");
      } catch {
        setError(
          isEn ? "Failed to parse CSV file." : "Error al leer el archivo CSV."
        );
        setStatus("idle");
      }
    },
    [isEn]
  );

  const handleImport = useCallback(async () => {
    if (parsedRows.length === 0) return;

    setStatus("importing");
    setError("");

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

      const res = await fetch(`${apiBase}/properties/import-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organization_id: orgId,
          rows: parsedRows.map((row) => ({
            name: row.name || "",
            code: row.code || undefined,
            address_line1: row.address_line1 || row.address || undefined,
            city: row.city || undefined,
            country_code: row.country_code || row.country || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { message?: string }).message ??
            (isEn ? "Import failed" : "Falló la importación")
        );
        setStatus("done");
        return;
      }

      const data = (await res.json()) as ImportResult;
      setResult(data);
      setStatus("done");
      if (data.failed === 0) {
        onComplete?.();
      }
    } catch {
      setError(
        isEn ? "Network error during import." : "Error de red durante la importación."
      );
      setStatus("done");
    }
  }, [parsedRows, orgId, isEn, onComplete]);

  const reset = () => {
    setParsedRows([]);
    setResult(null);
    setError("");
    setStatus("idle");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        {isEn ? "Import CSV" : "Importar CSV"}
      </Button>

      <Sheet
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
        open={open}
        title={
          isEn ? "Import Properties from CSV" : "Importar Propiedades desde CSV"
        }
        description={
          isEn
            ? "Upload a CSV file with columns: name (required), code, address_line1, city, country_code"
            : "Sube un CSV con columnas: name (obligatorio), code, address_line1, city, country_code"
        }
      >
        <div className="space-y-4">
          {/* File input */}
          <div>
            <input
              accept=".csv,text/csv"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={handleFile}
              ref={fileRef}
              type="file"
            />
          </div>

          {/* Expected columns */}
          <div className="text-muted-foreground text-xs">
            {isEn ? "Expected columns:" : "Columnas esperadas:"}{" "}
            {EXPECTED_COLUMNS.map((col) => (
              <code
                className="mx-0.5 rounded bg-muted px-1 py-0.5"
                key={col}
              >
                {col}
              </code>
            ))}
          </div>

          {/* Preview */}
          {parsedRows.length > 0 && !result ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {isEn ? "Preview" : "Vista previa"}: {parsedRows.length}{" "}
                {isEn ? "rows" : "filas"}
              </p>
              <div className="max-h-48 overflow-auto rounded border text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-1 text-left">#</th>
                      {EXPECTED_COLUMNS.map((col) => (
                        <th className="px-2 py-1 text-left" key={col}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((row, i) => (
                      <tr className="border-b last:border-b-0" key={i}>
                        <td className="px-2 py-1 text-muted-foreground">
                          {i + 1}
                        </td>
                        {EXPECTED_COLUMNS.map((col) => (
                          <td className="max-w-32 truncate px-2 py-1" key={col}>
                            {row[col] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 10 ? (
                  <p className="px-2 py-1 text-muted-foreground">
                    ...{parsedRows.length - 10}{" "}
                    {isEn ? "more rows" : "filas más"}
                  </p>
                ) : null}
              </div>

              <Button
                disabled={status === "importing"}
                onClick={handleImport}
              >
                {status === "importing"
                  ? isEn
                    ? "Importing..."
                    : "Importando..."
                  : isEn
                    ? `Import ${parsedRows.length} properties`
                    : `Importar ${parsedRows.length} propiedades`}
              </Button>
            </div>
          ) : null}

          {/* Error */}
          {error ? (
            <div className="rounded-lg border border-red-200/60 bg-red-50/40 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          ) : null}

          {/* Result */}
          {result ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">
                  {isEn ? "Import complete" : "Importación completa"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.succeeded} / {result.total}{" "}
                  {isEn ? "succeeded" : "exitosas"}
                  {result.failed > 0
                    ? `, ${result.failed} ${isEn ? "failed" : "fallaron"}`
                    : ""}
                </p>
              </div>

              {result.rows.filter((r) => !r.ok).length > 0 ? (
                <div className="max-h-32 overflow-auto text-xs">
                  {result.rows
                    .filter((r) => !r.ok)
                    .map((r) => (
                      <p className="text-red-600" key={r.index}>
                        {isEn ? "Row" : "Fila"} {r.index + 1}: {r.error}
                      </p>
                    ))}
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button onClick={reset} variant="outline">
                  {isEn ? "Import more" : "Importar más"}
                </Button>
                <Button
                  onClick={() => {
                    setOpen(false);
                    reset();
                    onComplete?.();
                  }}
                >
                  {isEn ? "Done" : "Listo"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
