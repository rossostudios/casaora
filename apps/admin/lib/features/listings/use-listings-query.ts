"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import {
  fetchListingsPaginated,
  type PaginatedListingsResponse,
} from "./listings-api";
import type { SavedView } from "./saved-views";

export type ListingsQueryState = {
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  readinessFilter: string;
  setReadinessFilter: (value: string) => void;
  applyView: (view: SavedView) => void;
  data: PaginatedListingsResponse | undefined;
  isLoading: boolean;
  totalRows: number;
  pageCount: number;
};

export function useListingsQuery(orgId: string): ListingsQueryState {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState("all");

  const queryParams = useMemo(() => {
    const sort = sorting[0];
    return {
      org_id: orgId,
      page: pagination.pageIndex + 1,
      per_page: pagination.pageSize,
      sort_by: sort?.id || "created_at",
      sort_order: (sort?.desc ? "desc" : "asc") as "asc" | "desc",
      q: globalFilter || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    };
  }, [orgId, sorting, pagination, globalFilter, statusFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["listings", queryParams],
    queryFn: () => fetchListingsPaginated(queryParams),
  });

  const totalRows = data?.total ?? 0;
  const pageCount = Math.ceil(totalRows / pagination.pageSize) || 1;

  return {
    sorting,
    setSorting,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter: useCallback((value: string) => {
      setGlobalFilter(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, []),
    statusFilter,
    setStatusFilter: useCallback((value: string) => {
      setStatusFilter(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, []),
    readinessFilter,
    setReadinessFilter: useCallback((value: string) => {
      setReadinessFilter(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, []),
    applyView: useCallback((view: SavedView) => {
      setGlobalFilter(view.globalFilter);
      setStatusFilter(view.statusFilter);
      setReadinessFilter(view.readinessFilter);
      setSorting(view.sorting);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, []),
    data,
    isLoading,
    totalRows,
    pageCount,
  };
}
