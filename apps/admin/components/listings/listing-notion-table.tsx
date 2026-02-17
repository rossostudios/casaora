"use client";

import {
  Bathtub01Icon,
  BedDoubleIcon,
  CheckmarkCircle02Icon,
  City01Icon,
  DollarCircleIcon,
  Home01Icon,
  Link01Icon,
  Megaphone01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  PipelineIcon,
  Rocket01Icon,
  RulerIcon,
  Task01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import {
  type ColumnDef,
  type FilterFn,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateListingInlineAction } from "@/app/(admin)/module/listings/actions";
import type { ListingRow } from "@/app/(admin)/module/listings/listings-manager";
import { EditableCell } from "@/components/properties/editable-cell";
import {
  ListingsFilterBar,
  type ListingReadinessFilter,
  type ListingStatusFilter,
} from "@/components/listings/listings-filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PROPERTY_TYPES } from "@/lib/features/marketplace/constants";
import { formatCurrency } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";

import { readinessScore } from "@/app/(admin)/module/listings/listings-manager";

/* ---------- helpers ---------- */

function ColHeader({
  icon,
  label,
}: {
  icon: typeof Megaphone01Icon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="text-muted-foreground/70" icon={icon} size={13} />
      <span>{label}</span>
    </span>
  );
}

const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPES.map((pt) => ({
  label: pt.labelEn,
  value: pt.value,
}));

function propertyTypeLabel(value: string | null, isEn: boolean): string {
  if (!value) return "";
  const found = PROPERTY_TYPES.find((pt) => pt.value === value);
  if (!found) return value;
  return isEn ? found.labelEn : found.labelEs;
}

/* ---------- global filter ---------- */

const globalFilterFn: FilterFn<ListingRow> = (row, _columnId, filterValue) => {
  const search = String(filterValue).toLowerCase();
  if (!search) return true;
  const d = row.original;
  return [d.title, d.city, d.property_type, d.property_name, d.unit_name]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(search));
};

/* ---------- types ---------- */

export type ListingSummary = {
  totalCount: number;
  publishedCount: number;
  draftCount: number;
  totalApplications: number;
};

type OptimisticAction = {
  id: string;
  field: keyof ListingRow;
  value: string;
};

type Props = {
  rows: ListingRow[];
  isEn: boolean;
  formatLocale: "en-US" | "es-PY";
  summary: ListingSummary;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onEditInSheet: (row: ListingRow) => void;
  onPublish: (listingId: string) => void;
  onUnpublish: (listingId: string) => void;
};

/* ---------- component ---------- */

export function ListingNotionTable({
  rows,
  isEn,
  formatLocale,
  summary,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEditInSheet,
  onPublish,
  onUnpublish,
}: Props) {
  const [, startTransition] = useTransition();

  /* --- optimistic editing --- */
  const [optimisticRows, addOptimistic] = useOptimistic(
    rows,
    (current: ListingRow[], action: OptimisticAction) =>
      current.map((r) =>
        r.id === action.id ? { ...r, [action.field]: action.value } : r
      )
  );

  const commitEdit = useCallback(
    async (listingId: string, field: string, next: string) => {
      startTransition(() => {
        addOptimistic({
          id: listingId,
          field: field as keyof ListingRow,
          value: next,
        });
      });

      const result = await updateListingInlineAction({
        listingId,
        field,
        value: next,
      });

      if (!result.ok) {
        toast.error(isEn ? "Failed to save" : "Error al guardar", {
          description: result.error,
        });
      } else {
        toast.success(isEn ? "Saved" : "Guardado");
      }
    },
    [addOptimistic, isEn, startTransition]
  );

  /* --- filter state --- */
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListingStatusFilter>("all");
  const [readinessFilter, setReadinessFilter] =
    useState<ListingReadinessFilter>("all");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  /* --- responsive column visibility --- */
  const isSm = useMediaQuery("(min-width: 640px)");
  const isMd = useMediaQuery("(min-width: 768px)");
  const isLg = useMediaQuery("(min-width: 1024px)");

  const columnVisibility = useMemo<VisibilityState>(() => {
    return {
      city: isSm,
      monthly_recurring_total: isSm,
      property_type: isMd,
      bedrooms: isMd,
      bathrooms: isMd,
      square_meters: isMd,
      readiness: isLg,
      pipeline: isLg,
    };
  }, [isSm, isMd, isLg]);

  /* --- pre-filter for status + readiness --- */
  const filteredData = useMemo(() => {
    let data = optimisticRows;
    if (statusFilter === "published") {
      data = data.filter((r) => r.is_published);
    } else if (statusFilter === "draft") {
      data = data.filter((r) => !r.is_published);
    }
    if (readinessFilter !== "all") {
      data = data.filter((r) => {
        const level = readinessScore(r).level;
        if (readinessFilter === "ready") return level === "green";
        if (readinessFilter === "incomplete") return level === "yellow";
        return level === "red";
      });
    }
    return data;
  }, [optimisticRows, statusFilter, readinessFilter]);

  /* --- columns --- */
  const columns = useMemo<ColumnDef<ListingRow>[]>(
    () => [
      {
        id: "select",
        size: 40,
        minSize: 40,
        maxSize: 40,
        enableResizing: false,
        enableSorting: false,
        header: ({ table: t }) => {
          const pageRowIds = t
            .getRowModel()
            .rows.map((r) => r.original.id);
          const allPageSelected =
            pageRowIds.length > 0 &&
            pageRowIds.every((id) => selectedIds.has(id));
          return (
            <Checkbox
              aria-label="Select all"
              checked={allPageSelected}
              onCheckedChange={() => onToggleSelectAll(pageRowIds)}
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => onToggleSelect(row.original.id)}
          />
        ),
      },
      {
        accessorKey: "title",
        size: 220,
        minSize: 140,
        header: () => (
          <ColHeader
            icon={Megaphone01Icon}
            label={isEn ? "Listing" : "Anuncio"}
          />
        ),
        cell: ({ row }) => {
          const data = row.original;
          const parts = [data.property_name, data.unit_name].filter(Boolean);
          // On mobile, show city in subtitle when city column is hidden
          if (!isSm && data.city) parts.push(data.city);
          const subtitle = parts.join(" · ");
          return (
            <EditableCell
              displayNode={
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-foreground text-sm truncate">
                    {data.title}
                  </span>
                  {subtitle ? (
                    <span className="text-muted-foreground text-xs truncate">
                      {subtitle}
                    </span>
                  ) : null}
                </div>
              }
              onCommit={(next) => commitEdit(data.id, "title", next)}
              value={data.title}
            />
          );
        },
      },
      {
        accessorKey: "is_published",
        size: 110,
        minSize: 90,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.is_published ? 1 : 0;
          const b = rowB.original.is_published ? 1 : 0;
          return a - b;
        },
        header: () => (
          <ColHeader
            icon={CheckmarkCircle02Icon}
            label={isEn ? "Status" : "Estado"}
          />
        ),
        cell: ({ row }) => {
          return row.original.is_published ? (
            <Badge variant="secondary">
              {isEn ? "Published" : "Publicado"}
            </Badge>
          ) : (
            <Badge variant="outline">{isEn ? "Draft" : "Borrador"}</Badge>
          );
        },
      },
      {
        id: "readiness",
        size: 120,
        minSize: 90,
        enableSorting: false,
        header: () => (
          <ColHeader
            icon={Task01Icon}
            label={isEn ? "Readiness" : "Preparación"}
          />
        ),
        cell: ({ row }) => {
          const r = readinessScore(row.original);
          if (r.level === "green") {
            return (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {isEn ? "Ready" : "Listo"}
              </Badge>
            );
          }
          if (r.level === "yellow") {
            return (
              <div className="space-y-1">
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {isEn
                    ? `${r.missing.length} missing`
                    : `${r.missing.length} faltante(s)`}
                </Badge>
                <p className="max-w-[180px] text-muted-foreground text-[11px]">
                  {r.missing.join(", ")}
                </p>
              </div>
            );
          }
          return (
            <div className="space-y-1">
              <Badge variant="destructive">
                {isEn ? "Not ready" : "No listo"}
              </Badge>
              <p className="max-w-[180px] text-muted-foreground text-[11px]">
                {r.missing.join(", ")}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "city",
        size: 130,
        minSize: 80,
        header: () => (
          <ColHeader icon={City01Icon} label={isEn ? "City" : "Ciudad"} />
        ),
        cell: ({ row }) => {
          const data = row.original;
          return (
            <EditableCell
              onCommit={(next) => commitEdit(data.id, "city", next)}
              value={data.city}
            />
          );
        },
      },
      {
        accessorKey: "property_type",
        size: 120,
        minSize: 90,
        header: () => (
          <ColHeader
            icon={Home01Icon}
            label={isEn ? "Type" : "Tipo"}
          />
        ),
        cell: ({ row }) => {
          const data = row.original;
          return (
            <EditableCell
              displayNode={
                <span className="text-sm">
                  {propertyTypeLabel(data.property_type, isEn) || "\u00A0"}
                </span>
              }
              onCommit={(next) =>
                commitEdit(data.id, "property_type", next)
              }
              options={PROPERTY_TYPE_OPTIONS}
              type="select"
              value={data.property_type ?? ""}
            />
          );
        },
      },
      {
        accessorKey: "bedrooms",
        size: 70,
        minSize: 60,
        header: () => (
          <ColHeader icon={BedDoubleIcon} label={isEn ? "Bd" : "Hab"} />
        ),
        cell: ({ row }) => {
          const data = row.original;
          return (
            <EditableCell
              onCommit={(next) => commitEdit(data.id, "bedrooms", next)}
              value={String(data.bedrooms)}
            />
          );
        },
      },
      {
        accessorKey: "bathrooms",
        size: 70,
        minSize: 60,
        header: () => (
          <ColHeader icon={Bathtub01Icon} label={isEn ? "Ba" : "Ba"} />
        ),
        cell: ({ row }) => {
          const data = row.original;
          return (
            <EditableCell
              onCommit={(next) => commitEdit(data.id, "bathrooms", next)}
              value={String(data.bathrooms)}
            />
          );
        },
      },
      {
        accessorKey: "square_meters",
        size: 80,
        minSize: 60,
        header: () => <ColHeader icon={RulerIcon} label="m²" />,
        cell: ({ row }) => {
          const data = row.original;
          return (
            <EditableCell
              onCommit={(next) => commitEdit(data.id, "square_meters", next)}
              value={String(data.square_meters)}
            />
          );
        },
      },
      {
        accessorKey: "monthly_recurring_total",
        size: 130,
        minSize: 100,
        header: () => (
          <ColHeader
            icon={DollarCircleIcon}
            label={isEn ? "Monthly" : "Mensual"}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {formatCurrency(
              row.original.monthly_recurring_total,
              row.original.currency,
              formatLocale
            )}
          </span>
        ),
      },
      {
        id: "pipeline",
        size: 90,
        minSize: 70,
        accessorFn: (row) => row.application_count,
        header: () => (
          <ColHeader
            icon={PipelineIcon}
            label={isEn ? "Pipeline" : "Pipeline"}
          />
        ),
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="space-y-1 text-sm">
              <p>
                {d.application_count} {isEn ? "apps" : "apps"}
              </p>
              {d.active_lease_count > 0 ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {isEn ? "Leased" : "Arrendado"}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        size: 48,
        minSize: 48,
        maxSize: 48,
        enableResizing: false,
        enableSorting: false,
        cell: ({ row }) => {
          const listing = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-7 w-7 p-0"
                )}
              >
                <span className="sr-only">Open menu</span>
                <Icon icon={MoreVerticalIcon} size={15} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {isEn ? "Actions" : "Acciones"}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEditInSheet(listing)}>
                  <Icon className="mr-2" icon={PencilEdit02Icon} size={14} />
                  {isEn ? "Edit" : "Editar"}
                </DropdownMenuItem>
                {listing.public_slug ? (
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(
                        `/marketplace/${encodeURIComponent(listing.public_slug)}`,
                        "_blank"
                      )
                    }
                  >
                    <Icon className="mr-2" icon={ViewIcon} size={14} />
                    {isEn ? "View public" : "Ver público"}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                {listing.is_published ? (
                  <DropdownMenuItem onClick={() => onUnpublish(listing.id)}>
                    <Icon className="mr-2" icon={Rocket01Icon} size={14} />
                    {isEn ? "Unpublish" : "Despublicar"}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onPublish(listing.id)}>
                    <Icon className="mr-2" icon={Rocket01Icon} size={14} />
                    {isEn ? "Publish" : "Publicar"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(listing.id)}
                >
                  <Icon className="mr-2" icon={Link01Icon} size={14} />
                  {isEn ? "Copy ID" : "Copiar ID"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isEn,
      isSm,
      formatLocale,
      commitEdit,
      selectedIds,
      onToggleSelect,
      onToggleSelectAll,
      onEditInSheet,
      onPublish,
      onUnpublish,
    ]
  );

  /* --- table instance --- */
  const table = useReactTable({
    data: filteredData,
    columns,
    columnResizeMode: "onChange",
    state: { sorting, globalFilter, pagination, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalCount = filteredData.length;

  return (
    <div className="space-y-3">
      <ListingsFilterBar
        globalFilter={globalFilter}
        isEn={isEn}
        onGlobalFilterChange={(v) => {
          setGlobalFilter(v);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        onReadinessFilterChange={(v) => {
          setReadinessFilter(v);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        onStatusFilterChange={(v) => {
          setStatusFilter(v);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        readinessFilter={readinessFilter}
        statusFilter={statusFilter}
      />

      <div className="overflow-x-auto rounded-md border">
        <Table
          className="table-fixed"
          style={{ width: table.getTotalSize() }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    className="relative whitespace-nowrap select-none text-[11px] uppercase tracking-wider"
                    grid
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getIsSorted() === "asc"
                          ? " \u2191"
                          : header.column.getIsSorted() === "desc"
                            ? " \u2193"
                            : ""}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}

                    {header.column.getCanResize() && (
                      <div
                        className={cn(
                          "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                          "hover:bg-primary/30",
                          header.column.getIsResizing() && "bg-primary/50"
                        )}
                        onDoubleClick={() => header.column.resetSize()}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="hover:bg-muted/20"
                  data-state={selectedIds.has(row.original.id) && "selected"}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      className="py-1.5"
                      grid
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="py-8 text-center text-muted-foreground"
                  colSpan={table.getVisibleLeafColumns().length}
                >
                  {isEn ? "No listings found" : "No se encontraron anuncios"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell
                className="font-medium text-xs"
                colSpan={table.getVisibleLeafColumns().length}
              >
                {summary.totalCount} {isEn ? "listings" : "anuncios"} &middot;{" "}
                {summary.publishedCount} {isEn ? "published" : "publicados"} &middot;{" "}
                {summary.draftCount} {isEn ? "draft" : "borrador"} &middot;{" "}
                {summary.totalApplications} {isEn ? "applications" : "aplicaciones"}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground text-sm">
          {filteredCount !== totalCount
            ? `${filteredCount} / ${totalCount}`
            : `${totalCount}`}{" "}
          {isEn ? "listings" : "anuncios"}
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            size="sm"
            variant="outline"
          >
            {isEn ? "Previous" : "Anterior"}
          </Button>
          <span className="text-muted-foreground text-sm">
            {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount() || 1}
          </span>
          <Button
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            size="sm"
            variant="outline"
          >
            {isEn ? "Next" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
