/**
 * Generic CSV/PDF export utilities for admin modules.
 */

type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number;
};

/**
 * Download data as a CSV file.
 */
export function exportCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[]
): void {
  const headers = columns.map((col) => col.header);
  const csvRows = [headers.join(",")];

  for (const row of rows) {
    const cells = columns.map((col) => {
      const raw = String(col.accessor(row));
      // Escape commas, quotes, and newlines
      if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
        return `"${raw.replace(/"/g, '""').replace(/\n/g, " ")}"`;
      }
      return raw;
    });
    csvRows.push(cells.join(","));
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
