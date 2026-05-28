import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useSearchParams } from "react-router-dom";
import { PlusCircle, Search, Download, SlidersHorizontal, X, Inbox, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadCSV } from "@/utils/csv";
import { Pagination } from "@/components/ui/pagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DataItem = { _id: string; createdAt: string };
type PagedPayload<T> = { data: T[]; total: number; page: number; pages: number };

export type FilterConfig = {
  label: string;
  field: string;
  type: "select" | "date-range" | "number-range" | "text";
  options?: { label: string; value: string }[];
};

type GenericTableProps<T extends DataItem> = {
  queryKey: string;
  fetchData: (params: { page: number; limit: number; q: string; filters?: Record<string, string>; sort?: string; dir?: "asc" | "desc" }) => Promise<{ data: T[] | PagedPayload<T> }>;
  deleteData: (id: string) => Promise<void>;
  headers: string[];
  sortableHeaders?: string[];
  renderRow: (item: T, handleDelete: (id: string) => void) => JSX.Element;
  title: string;
  description: string;
  addLink: string;
  addLabel: string;
  onAdd?: () => void;
  emptyMessage?: string;
  noSearchMessage?: (q: string) => string;
  exportConfig?: {
    filename: string;
    getRow: (item: T) => Record<string, unknown>;
  };
  filterConfigs?: FilterConfig[];
  module?: string;
  quickStatusFilter?: {
    field: string;
    options: { value: string; label: string }[];
  };
  topContent?: React.ReactNode;
};

const SKELETON_WIDTHS = ["w-28", "w-20", "w-24", "w-16", "w-32", "w-12"];

export function GenericTable<T extends DataItem>({
  queryKey,
  fetchData,
  deleteData,
  headers,
  sortableHeaders,
  renderRow,
  title,
  description,
  addLink,
  addLabel,
  onAdd,
  emptyMessage,
  noSearchMessage,
  exportConfig,
  filterConfigs,
  module,
  quickStatusFilter,
  topContent,
}: GenericTableProps<T>) {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  const { getFilterableCustomFields } = useWorkspaceSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const committedQ    = searchParams.get("q") ?? "";
  const page          = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit         = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "25")));
  const sortBy        = searchParams.get("sort") ?? "";
  const sortDir       = (searchParams.get("dir") ?? "asc") as "asc" | "desc";

  const toggleSort = (header: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (sortBy === header && sortDir === "asc") {
        next.set("dir", "desc");
      } else if (sortBy === header && sortDir === "desc") {
        next.delete("sort");
        next.delete("dir");
      } else {
        next.set("sort", header);
        next.set("dir", "asc");
      }
      next.set("page", "1");
      return next;
    }, { replace: true });
  };

  const customFieldConfigs = useMemo<FilterConfig[]>(() => {
    if (!module) return [];
    return getFilterableCustomFields(module).map((f) => {
      const field = `cf_${f.id}`;
      if (f.type === "select" && f.options)
        return { label: f.label, field, type: "select" as const, options: f.options.split(",").map((o) => ({ label: o.trim(), value: o.trim() })) };
      if (f.type === "number") return { label: f.label, field, type: "number-range" as const };
      if (f.type === "date")   return { label: f.label, field, type: "date-range" as const };
      return { label: f.label, field, type: "text" as const };
    });
  }, [module, getFilterableCustomFields]);

  const allFilterConfigs = useMemo<FilterConfig[]>(
    () => [...(filterConfigs ?? []), ...customFieldConfigs],
    [filterConfigs, customFieldConfigs],
  );

  const activeFilters: Record<string, string> = {};
  for (const fc of allFilterConfigs) {
    if (fc.type === "date-range" || fc.type === "number-range") {
      const fromKey = fc.type === "number-range" ? `${fc.field}_min` : `${fc.field}_from`;
      const toKey   = fc.type === "number-range" ? `${fc.field}_max` : `${fc.field}_to`;
      const from = searchParams.get(fromKey);
      const to   = searchParams.get(toKey);
      if (from) activeFilters[fromKey] = from;
      if (to)   activeFilters[toKey]   = to;
    } else {
      const val = searchParams.get(fc.field);
      if (val) activeFilters[fc.field] = val;
    }
  }
  // Quick status tab value also feeds into server-side filters
  if (quickStatusFilter) {
    const qsVal = searchParams.get(quickStatusFilter.field);
    if (qsVal) activeFilters[quickStatusFilter.field] = qsVal;
  }
  const activeFilterCount = Object.keys(activeFilters).length;

  const [localSearch, setLocalSearch] = useState(committedQ);
  const [filterDraft, setFilterDraft] = useState<Record<string, string>>(activeFilters);
  const [sheetOpen, setSheetOpen]     = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        localSearch ? next.set("q", localSearch) : next.delete("q");
        next.set("page", "1");
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const setPage  = (p: number) => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set("page", String(p)); return n; }, { replace: true });
  const setLimit = (l: number) => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set("limit", String(l)); n.set("page", "1"); return n; }, { replace: true });

  const applyFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      for (const fc of allFilterConfigs) {
        if (fc.type === "date-range") {
          const from = filterDraft[`${fc.field}_from`];
          const to   = filterDraft[`${fc.field}_to`];
          from ? next.set(`${fc.field}_from`, from) : next.delete(`${fc.field}_from`);
          to   ? next.set(`${fc.field}_to`,   to)   : next.delete(`${fc.field}_to`);
        } else if (fc.type === "number-range") {
          const min = filterDraft[`${fc.field}_min`];
          const max = filterDraft[`${fc.field}_max`];
          min ? next.set(`${fc.field}_min`, min) : next.delete(`${fc.field}_min`);
          max ? next.set(`${fc.field}_max`, max) : next.delete(`${fc.field}_max`);
        } else {
          const val = filterDraft[fc.field];
          val ? next.set(fc.field, val) : next.delete(fc.field);
        }
      }
      return next;
    }, { replace: true });
    setSheetOpen(false);
  };

  const removeFilter = (key: string) => {
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete(key); n.set("page", "1"); return n; }, { replace: true });
    setFilterDraft((d) => { const n = { ...d }; delete n[key]; return n; });
  };

  const clearAllFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const fc of allFilterConfigs) {
        if (fc.type === "date-range")   { next.delete(`${fc.field}_from`); next.delete(`${fc.field}_to`); }
        else if (fc.type === "number-range") { next.delete(`${fc.field}_min`); next.delete(`${fc.field}_max`); }
        else next.delete(fc.field);
      }
      next.set("page", "1");
      return next;
    }, { replace: true });
    setFilterDraft({});
  };

  const filterLabel = (key: string, value: string): string => {
    for (const fc of allFilterConfigs) {
      if (fc.type === "date-range") {
        if (key === `${fc.field}_from`) return `${fc.label} from: ${value}`;
        if (key === `${fc.field}_to`)   return `${fc.label} to: ${value}`;
      } else if (fc.type === "number-range") {
        if (key === `${fc.field}_min`) return `${fc.label} ≥ ${value}`;
        if (key === `${fc.field}_max`) return `${fc.label} ≤ ${value}`;
      } else if (fc.field === key) {
        const opt = fc.options?.find((o) => o.value === value);
        return `${fc.label}: ${opt?.label ?? value}`;
      }
    }
    return `${key}: ${value}`;
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data, isLoading, error, isPreviousData } = useQuery(
    [queryKey, page, limit, committedQ, JSON.stringify(activeFilters), sortBy, sortDir],
    () => fetchData({ page, limit, q: committedQ, filters: activeFilters, ...(sortBy ? { sort: sortBy, dir: sortDir } : {}) }),
    { keepPreviousData: true },
  );

  const mutation = useMutation(deleteData, {
    onSuccess: () => { queryClient.invalidateQueries(queryKey); toast({ title: tr.common.deleted }); },
    onError:   () => { toast({ title: tr.common.deleteFailed, variant: "destructive" }); },
  });

  const handleDelete = (id: string) => setPendingDeleteId(id);
  const confirmDelete = () => {
    if (pendingDeleteId) { mutation.mutate(pendingDeleteId); setPendingDeleteId(null); }
  };

  if (error) return <div className="p-6 text-sm text-destructive">Error loading {title.toLowerCase()}.</div>;

  const rawPayload  = data?.data;
  const isPaged     = rawPayload !== undefined && !Array.isArray(rawPayload) && "data" in rawPayload;
  const dataList: T[] = isPaged ? (rawPayload as PagedPayload<T>).data : Array.isArray(rawPayload) ? rawPayload : [];
  const paginationInfo: PagedPayload<T> | null = isPaged ? (rawPayload as PagedPayload<T>) : null;

  const filtered = isPaged
    ? dataList
    : committedQ
      ? dataList.filter((item) => Object.values(item).some((v) => typeof v === "string" && v.toLowerCase().includes(committedQ.toLowerCase())))
      : dataList;

  const totalCount = paginationInfo ? paginationInfo.total : filtered.length;

  return (
    <div className="flex flex-col pb-6 min-h-full bg-muted/30 dark:bg-muted/10">
      <ConfirmDialog open={!!pendingDeleteId} onConfirm={confirmDelete} onCancel={() => setPendingDeleteId(null)} />

      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-card shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {totalCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {exportConfig && (
            <Button
              variant="outline" size="sm" className="h-8 gap-1.5"
              onClick={() => downloadCSV(filtered.map(exportConfig.getRow), exportConfig.filename)}
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tr.common.exportCsv}</span>
            </Button>
          )}
          {onAdd ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={onAdd}>
              <PlusCircle className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          ) : (
            <Link to={addLink}>
              <Button size="sm" className="h-8 gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" />
                {addLabel}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Optional top content (e.g. summary bar) ── */}
      {topContent && (
        <div className="px-6 py-3 border-b bg-card shrink-0">
          {topContent}
        </div>
      )}

      {/* ── Toolbar: search + filters + active chips ── */}
      <div className="px-6 py-3 border-b bg-card shrink-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Search ${title.toLowerCase()}…`}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="ps-8 h-8 text-sm bg-muted/40 border-transparent focus:border-input focus:bg-background transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {allFilterConfigs.length > 0 && (
            <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (o) setFilterDraft(activeFilters); }}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ms-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] p-0 flex flex-col">
                <SheetHeader className="px-5 py-4 border-b shrink-0">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-base">Filters</SheetTitle>
                    {activeFilterCount > 0 && (
                      <button onClick={() => setFilterDraft({})} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                        Reset all
                      </button>
                    )}
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                  {allFilterConfigs.map((fc) => (
                    <div key={fc.field} className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{fc.label}</p>
                      {fc.type === "select" && (
                        <div className="flex flex-wrap gap-1.5">
                          {fc.options?.map((o) => {
                            const active = filterDraft[fc.field] === o.value;
                            return (
                              <button
                                key={o.value}
                                onClick={() => setFilterDraft((d) => ({ ...d, [fc.field]: active ? "" : o.value }))}
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                                  active
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                )}
                              >
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {fc.type === "text" && (
                        <Input type="text" placeholder={`Search by ${fc.label.toLowerCase()}…`} className="h-8 text-sm"
                          value={filterDraft[fc.field] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [fc.field]: e.target.value }))} />
                      )}
                      {fc.type === "date-range" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">From</Label>
                            <Input type="date" className="h-8 text-sm"
                              value={filterDraft[`${fc.field}_from`] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [`${fc.field}_from`]: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">To</Label>
                            <Input type="date" className="h-8 text-sm"
                              value={filterDraft[`${fc.field}_to`] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [`${fc.field}_to`]: e.target.value }))} />
                          </div>
                        </div>
                      )}
                      {fc.type === "number-range" && (
                        <div className="flex items-center gap-2">
                          <Input type="number" placeholder="Min" className="h-8 text-sm"
                            value={filterDraft[`${fc.field}_min`] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [`${fc.field}_min`]: e.target.value }))} />
                          <span className="text-muted-foreground text-xs shrink-0">–</span>
                          <Input type="number" placeholder="Max" className="h-8 text-sm"
                            value={filterDraft[`${fc.field}_max`] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [`${fc.field}_max`]: e.target.value }))} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-5 py-4 border-t shrink-0">
                  <Button className="w-full h-9" onClick={applyFilters}>Apply Filters</Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(activeFilters).map(([key, value]) => (
              <span key={key} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">
                {filterLabel(key, value)}
                <button onClick={() => removeFilter(key)} className="hover:text-destructive transition-colors ms-0.5 opacity-60 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Quick status tabs ── */}
      {quickStatusFilter && (
        <div className="px-6 pt-3 flex items-center gap-0.5 overflow-x-auto shrink-0">
          {[{ value: "all", label: "All" }, ...quickStatusFilter.options].map(({ value, label }) => {
            const active = (searchParams.get(quickStatusFilter.field) ?? "all") === value;
            return (
              <button
                key={value}
                onClick={() => setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  value === "all" ? next.delete(quickStatusFilter.field) : next.set(quickStatusFilter.field, value);
                  next.set("page", "1");
                  return next;
                }, { replace: true })}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Table ── */}
      <Card className={cn("mx-6 mt-3 shadow-sm border-border/60 transition-opacity overflow-hidden", isPreviousData && !isLoading ? "opacity-60" : "opacity-100")}>
        <CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30 border-b-2 border-border/60">
              {headers.map((header, i) => {
                const isSortable = sortableHeaders?.includes(header);
                const isActive   = sortBy === header;
                const SortIcon   = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <TableHead
                    key={header}
                    className={cn(
                      "h-9 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 whitespace-nowrap",
                      i > 1 ? "hidden md:table-cell" : "",
                      isSortable && "cursor-pointer select-none hover:text-foreground/80 transition-colors",
                    )}
                    onClick={isSortable ? () => toggleSort(header) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header}
                      {isSortable && (
                        <SortIcon className={cn("h-3 w-3 shrink-0", isActive ? "text-foreground/70" : "opacity-30")} />
                      )}
                    </span>
                  </TableHead>
                );
              })}
              <TableHead className="w-10">
                <span className="sr-only">{tr.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="[&>tr:nth-child(even)]:bg-muted/[0.03] dark:[&>tr:nth-child(even)]:bg-muted/[0.08]">
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent animate-pulse">
                  {headers.map((h, hi) => (
                    <TableCell key={h} className={hi > 1 ? "hidden md:table-cell" : ""}>
                      <Skeleton className={cn("h-4", SKELETON_WIDTHS[(i + hi) % SKELETON_WIDTHS.length])} />
                    </TableCell>
                  ))}
                  <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
                </TableRow>
              ))}

            {!isLoading && filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={headers.length + 1} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground/70">
                        {committedQ
                          ? (noSearchMessage ? noSearchMessage(committedQ) : `No results for "${committedQ}"`)
                          : (emptyMessage ?? `No ${title.toLowerCase()} yet`)}
                      </p>
                      {!committedQ && (
                        <p className="text-xs text-muted-foreground">Get started by adding your first {title.toLowerCase().replace(/s$/, "")}.</p>
                      )}
                    </div>
                    {!committedQ && (
                      onAdd ? (
                        <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={onAdd}>
                          <PlusCircle className="h-3.5 w-3.5" />
                          {addLabel}
                        </Button>
                      ) : (
                        <Link to={addLink}>
                          <Button size="sm" variant="outline" className="gap-1.5 mt-1">
                            <PlusCircle className="h-3.5 w-3.5" />
                            {addLabel}
                          </Button>
                        </Link>
                      )
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && filtered.map((item) => renderRow(item, handleDelete))}
          </TableBody>
        </Table>
          {paginationInfo && (
            <div className="border-t">
              <Pagination
                page={paginationInfo.page}
                pages={paginationInfo.pages}
                total={paginationInfo.total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
