import { Children, cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import type { JSX, ReactElement, ReactNode } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useSearchParams } from "react-router-dom";
import { PlusCircle, Search, Download, Upload, SlidersHorizontal, X, ArrowUpDown, ArrowUp, ArrowDown, Users, Bookmark, Save, Trash2 } from "lucide-react";
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
import { DENSITY_PAGE_SIZE, useTheme } from "@/contexts/ThemeProvider";
import { downloadCSV, saveBlob } from "@/utils/csv";
import { exportEntity } from "@/utils/api";
import { ImportDialog } from "@/components/common/ImportDialog";
import { DedupDialog } from "@/components/common/DedupDialog";
import { BulkActionBar } from "@/components/common/BulkActionBar";
import { PermissionGate } from "@/components/common/PermissionGate";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import type { Permission } from "@/config/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSavedViews, createSavedView, deleteSavedView, type SavedView } from "@/utils/api";
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

/**
 * What a column IS, rather than a header string and a positionally-matched cell.
 *
 * The legacy `headers[] + renderRow()` pair could not support column reordering,
 * hiding or persistence, because the two were only related by array position:
 * `withMobileLabels` matched a row's Nth child to `headers[N]`, and the
 * *translated* header string doubled as the sort key — so a column's identity
 * changed with the UI language. Anything built on that would have been a hack.
 *
 * With this, one definition drives the header, the cell, mobile labelling,
 * alignment, truncation and sort identity together.
 */
export type ColumnKind = "text" | "number" | "status" | "date" | "actions";

export type TableColumn<T> = {
  /** Stable, untranslated. The sort/persistence identity — never a display string. */
  id: string;
  /** Translated label for the header and the mobile card's field name. */
  header: string;
  /** API sort field. Omit for a column that cannot be sorted. */
  sortKey?: string;
  /** Drives alignment, numeric glyphs and whether the column may flex. */
  kind?: ColumnKind;
  cell: (item: T) => ReactNode;
  /** False pins the column visible (e.g. the record's identifier). Default true. */
  hideable?: boolean;
  /** Overrides `header` on the mobile card when the full label is too long. */
  mobileLabel?: string;
};

/**
 * Per-kind cell presentation. `text` is the only kind allowed to flex and
 * truncate — `min-w-0` is required for truncation to work inside a flex/grid
 * ancestor. Numerics get tabular figures so digits line up down the column.
 */
const COLUMN_KIND_CLASS: Record<ColumnKind, string> = {
  text: "min-w-0 max-w-0 w-full truncate",
  number: "text-end tabular-nums whitespace-nowrap w-px",
  date: "whitespace-nowrap w-px",
  status: "whitespace-nowrap w-px",
  actions: "w-px",
};

type GenericTableProps<T extends DataItem> = {
  queryKey: string;
  fetchData: (params: { page: number; limit: number; q: string; filters?: Record<string, string>; sort?: string; dir?: "asc" | "desc" }) => Promise<{ data: T[] | PagedPayload<T> }>;
  /** Omit for read-only tables (e.g. inventory) that have no per-row delete. */
  deleteData?: (id: string) => Promise<void>;
  /**
   * Preferred. When set, the table owns header and cell rendering, and
   * `headers`/`sortableHeaders`/`renderRow` are ignored. Callers not yet
   * migrated keep working through the legacy props below.
   */
  columns?: TableColumn<T>[];
  /** Row-level click target, used only with `columns`. */
  onRowClick?: (item: T) => void;
  /** Trailing per-row actions cell, used only with `columns`. */
  renderActions?: (item: T, handleDelete: (id: string) => void) => ReactNode;
  /**
   * Row-level presentation driven by the record's own state — a dimmed inactive
   * account, an overdue invoice. Used only with `columns`. Without it a caller
   * has to repeat the same conditional class in every `cell`, which is how the
   * six copies of `isActive ? "" : "opacity-50"` in Chart of Accounts appeared.
   */
  rowClassName?: (item: T) => string | undefined;
  headers?: string[];
  sortableHeaders?: string[];
  renderRow?: (item: T, handleDelete: (id: string) => void, selectionCell?: React.ReactNode) => JSX.Element;
  title: string;
  description: string;
  /** Omit both to hide the "Add" affordance for tables with no create flow. */
  addLink?: string;
  addLabel?: string;
  onAdd?: () => void;
  emptyMessage?: string;
  noSearchMessage?: (q: string) => string;
  exportConfig?: {
    filename?: string;
    /** Builds a CSV row from a loaded item (client-side fallback export). */
    getRow?: (item: T) => Record<string, unknown>;
    /**
     * When set, Export streams the FULL module dataset from the backend
     * (`/export/:entity`) instead of only the rows currently loaded in the table.
     * Takes precedence over `getRow`.
     */
    entity?: string;
  };
  importConfig?: {
    /** Import target key understood by the backend, e.g. "customers". */
    entity: string;
    /** Label shown in the dialog title, e.g. "Contacts". */
    title: string;
    /** When set, the Import button is gated behind this permission. */
    permission?: Permission;
  };
  dedupConfig?: {
    entity: string;
    title: string;
    permission?: Permission;
  };
  bulkConfig?: {
    /** Bulk target key understood by the backend, e.g. "customers". */
    entity: string;
    /** Status choices for the "Set status" bulk action; omit to hide it. */
    statusOptions?: { value: string; label: string }[];
  };
  filterConfigs?: FilterConfig[];
  module?: string;
  quickStatusFilter?: {
    field: string;
    options: { value: string; label: string }[];
  };
  topContent?: React.ReactNode;
  /** Compact controls rendered inline in the header (e.g. a list/board toggle). */
  headerExtra?: React.ReactNode;
  /** Reorders or filters an unpaginated client-side dataset before rows render. */
  transformClientData?: (items: T[], context: { q: string; filters: Record<string, string> }) => T[];
};

const SKELETON_WIDTHS = ["w-28", "w-20", "w-24", "w-16", "w-32", "w-12"];
const SELECTION_CELL_CLASS = "w-10 min-w-10 max-w-10 p-0 text-center";
const SELECTION_CHECKBOX_WRAP_CLASS = "flex h-full min-h-9 items-center justify-center";

function withMobileLabels(row: JSX.Element, headers: string[], hasSelection: boolean) {
  if (!isValidElement(row)) return row;
  const typedRow = row as ReactElement<{ className?: string; children?: ReactNode }>;

  const children = Children.map(typedRow.props.children, (child, index) => {
    if (!isValidElement(child)) return child;
    const typedChild = child as ReactElement<{ className?: string; children?: ReactNode; "data-label"?: string }>;

    const labelIndex = index - (hasSelection ? 1 : 0);
    const isSelection = hasSelection && index === 0;
    const label =
      isSelection ? "" :
      labelIndex >= 0 && labelIndex < headers.length ? headers[labelIndex] :
      "Actions";

    return cloneElement(typedChild, {
      "data-label": label || undefined,
      className: cn(
        typedChild.props.className,
        isSelection
          ? "max-md:py-2 max-md:px-3"
          : "max-md:grid max-md:grid-cols-[7.5rem_1fr] max-md:items-start max-md:gap-3 max-md:px-3 max-md:py-2 max-md:before:content-[attr(data-label)] max-md:before:text-xs max-md:before:font-medium max-md:before:text-muted-foreground",
      ),
    });
  });

  return cloneElement(typedRow, {
    className: cn(
      typedRow.props.className,
      "max-md:block max-md:border max-md:rounded-md max-md:mb-2 max-md:bg-card max-md:shadow-sm max-md:overflow-hidden",
    ),
    children,
  });
}

export function GenericTable<T extends DataItem>({
  queryKey,
  fetchData,
  deleteData,
  columns,
  onRowClick,
  renderActions,
  rowClassName,
  headers: legacyHeaders,
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
  importConfig,
  dedupConfig,
  bulkConfig,
  filterConfigs,
  module,
  quickStatusFilter,
  topContent,
  headerExtra,
  transformClientData,
}: GenericTableProps<T>) {
  const { tr, isRTL } = useLanguage();
  const { density } = useTheme();
  const queryClient = useQueryClient();
  const { getFilterableCustomFields } = useWorkspaceSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);

  // Export handler: prefer a full-dataset backend stream when `entity` is set;
  // otherwise fall back to a client-side CSV of the rows currently loaded.
  const handleExport = async () => {
    if (!exportConfig) return;
    if (exportConfig.entity) {
      try {
        setExporting(true);
        const res = await exportEntity(exportConfig.entity);
        saveBlob(res.data as Blob, exportConfig.filename ?? exportConfig.entity);
      } catch {
        toast({ title: "Export failed", variant: "destructive" });
      } finally {
        setExporting(false);
      }
    } else if (exportConfig.getRow) {
      downloadCSV(filtered.map(exportConfig.getRow), exportConfig.filename ?? "export");
    }
  };

  const committedQ    = searchParams.get("q") ?? "";
  const page          = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  // An explicit ?limit in the URL always wins — a shared or saved link must
  // resolve to the same page of rows for whoever opens it, regardless of the
  // density they happen to prefer. Density only supplies the default.
  const limit         = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? String(DENSITY_PAGE_SIZE[density]))));
  const sortBy        = searchParams.get("sort") ?? "";
  const sortDir       = (searchParams.get("dir") ?? "asc") as "asc" | "desc";

  // `columns` supersedes the legacy props. Header labels are derived from the
  // definitions so the two can never drift apart.
  const usingColumns = Boolean(columns?.length);
  const headers = usingColumns ? columns!.map((c) => c.header) : (legacyHeaders ?? []);

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

  const activeFilters = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const fc of allFilterConfigs) {
      if (fc.type === "date-range" || fc.type === "number-range") {
        const fromKey = fc.type === "number-range" ? `${fc.field}_min` : `${fc.field}_from`;
        const toKey   = fc.type === "number-range" ? `${fc.field}_max` : `${fc.field}_to`;
        const from = searchParams.get(fromKey);
        const to   = searchParams.get(toKey);
        if (from) next[fromKey] = from;
        if (to)   next[toKey]   = to;
      } else {
        const val = searchParams.get(fc.field);
        if (val) next[fc.field] = val;
      }
    }
    // Quick status tab value also feeds into server-side filters.
    if (quickStatusFilter) {
      const qsVal = searchParams.get(quickStatusFilter.field);
      if (qsVal) next[quickStatusFilter.field] = qsVal;
    }
    return next;
  }, [allFilterConfigs, quickStatusFilter, searchParams]);
  const activeFiltersKey = useMemo(() => JSON.stringify(activeFilters), [activeFilters]);
  const activeFilterCount = Object.keys(activeFilters).length;

  const [localSearch, setLocalSearch] = useState(committedQ);
  const [filterDraft, setFilterDraft] = useState<Record<string, string>>(activeFilters);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  const [dedupOpen, setDedupOpen]     = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());

  // Saved views for this module (per-user list-query presets).
  const savedViewsQuery = useQuery({
    queryKey: ["saved-views", module],
    queryFn: () => getSavedViews(module as string),
    enabled: !!module,
  });
  const savedViews: SavedView[] = savedViewsQuery.data?.data ?? [];

  const applySavedView = (view: SavedView) =>
    setSearchParams(new URLSearchParams(view.query), { replace: true });

  const saveCurrentView = async () => {
    const name = window.prompt(tr.tools.views.namePrompt);
    if (!name?.trim() || !module) return;
    await createSavedView({ module, name: name.trim(), query: searchParams.toString() });
    saveViewMutationDone();
  };
  const saveViewMutationDone = () => queryClient.invalidateQueries({ queryKey: ["saved-views", module] });
  const removeSavedView = async (id: string) => { await deleteSavedView(id); saveViewMutationDone(); };

  const toggleSelected = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelected(new Set());

  // Selection is per-view; drop it whenever the underlying query changes.
  useEffect(() => { setSelected(new Set()); }, [activeFiltersKey, committedQ, page, sortBy, sortDir]);

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

  const { data, isPending, error, isPlaceholderData } = useQuery({
    queryKey: [queryKey, page, limit, committedQ, activeFiltersKey, sortBy, sortDir],
    queryFn: () => fetchData({ page, limit, q: committedQ, filters: activeFilters, ...(sortBy ? { sort: sortBy, dir: sortDir } : {}) }),
    placeholderData: keepPreviousData
  });

  const mutation = useMutation({
    mutationFn: deleteData ?? (async () => {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: tr.common.deleted }); },
    onError:   () => { toast({ title: tr.common.deleteFailed, variant: "destructive" }); }
  });

  const handleDelete = (id: string) => setPendingDeleteId(id);
  const confirmDelete = () => {
    if (pendingDeleteId) { mutation.mutate(pendingDeleteId); setPendingDeleteId(null); }
  };

  if (error) return <div className="p-6"><ErrorState description={tr.common.errorLoading} /></div>;

  const rawPayload  = data?.data;
  const isPaged     = rawPayload !== undefined && !Array.isArray(rawPayload) && "data" in rawPayload;
  const dataList: T[] = isPaged ? (rawPayload as PagedPayload<T>).data : Array.isArray(rawPayload) ? rawPayload : [];
  const paginationInfo: PagedPayload<T> | null = isPaged ? (rawPayload as PagedPayload<T>) : null;

  const filtered = isPaged
    ? dataList
    : transformClientData
      ? transformClientData(dataList, { q: committedQ, filters: activeFilters })
      : committedQ
        ? dataList.filter((item) => Object.values(item).some((v) => typeof v === "string" && v.toLowerCase().includes(committedQ.toLowerCase())))
        : dataList;

  const totalCount = paginationInfo ? paginationInfo.total : filtered.length;

  return (
    <div className="flex flex-col pb-6 min-h-full bg-muted/30 dark:bg-muted/10">
      <ConfirmDialog open={!!pendingDeleteId} onConfirm={confirmDelete} onCancel={() => setPendingDeleteId(null)} />
      {importConfig && (
        <ImportDialog
          entity={importConfig.entity}
          title={importConfig.title}
          open={importOpen}
          onOpenChange={setImportOpen}
          onDone={() => queryClient.invalidateQueries({ queryKey: [queryKey] })}
        />
      )}
      {dedupConfig && (
        <DedupDialog
          entity={dedupConfig.entity}
          title={dedupConfig.title}
          open={dedupOpen}
          onOpenChange={setDedupOpen}
          onDone={() => queryClient.invalidateQueries({ queryKey: [queryKey] })}
        />
      )}
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-card shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
            {!isPending && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {totalCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerExtra}
          {importConfig && (() => {
            const importBtn = (
              <Button
                variant="outline" size="sm" className="h-8 gap-1.5"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tr.common.importCsv}</span>
              </Button>
            );
            return importConfig.permission
              ? <PermissionGate require={importConfig.permission}>{importBtn}</PermissionGate>
              : importBtn;
          })()}
          {dedupConfig && (() => {
            const dedupBtn = (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setDedupOpen(true)}>
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tr.tools.dedup.button}</span>
              </Button>
            );
            return dedupConfig.permission
              ? <PermissionGate require={dedupConfig.permission}>{dedupBtn}</PermissionGate>
              : dedupBtn;
          })()}
          {exportConfig && (
            <Button
              variant="outline" size="sm" className="h-8 gap-1.5"
              onClick={handleExport}
              // Backend export streams the whole dataset, so it's enabled even when
              // the current page is empty; the client-side fallback needs loaded rows.
              disabled={exporting || (!exportConfig.entity && filtered.length === 0)}
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
          ) : addLink ? (
            <Link to={addLink}>
              <Button size="sm" className="h-8 gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" />
                {addLabel}
              </Button>
            </Link>
          ) : null}
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
              aria-label={tr.table.searchPlaceholder(title)}
              placeholder={tr.table.searchPlaceholder(title)}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="ps-8 h-8 text-sm bg-muted/40 border-transparent focus:border-input focus:bg-background transition-colors"
            />
            {localSearch && (
              <button
                type="button"
                aria-label={tr.table.clearSearch}
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
                  {tr.table.filters}
                  {activeFilterCount > 0 && (
                    <Badge className="ms-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? "left" : "right"} className="w-[320px] p-0 flex flex-col">
                <SheetHeader className="px-5 py-4 border-b shrink-0">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-base">{tr.table.filters}</SheetTitle>
                    {activeFilterCount > 0 && (
                      <button onClick={() => setFilterDraft({})} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                        {tr.table.resetAll}
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
                        <Input type="text" placeholder={tr.table.filterSearchBy(fc.label)} className="h-8 text-sm"
                          value={filterDraft[fc.field] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [fc.field]: e.target.value }))} />
                      )}
                      {fc.type === "date-range" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{tr.table.filterFrom}</Label>
                            <Input type="date" className="h-8 text-sm"
                              value={filterDraft[`${fc.field}_from`] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [`${fc.field}_from`]: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{tr.table.filterTo}</Label>
                            <Input type="date" className="h-8 text-sm"
                              value={filterDraft[`${fc.field}_to`] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [`${fc.field}_to`]: e.target.value }))} />
                          </div>
                        </div>
                      )}
                      {fc.type === "number-range" && (
                        <div className="flex items-center gap-2">
                          <Input type="number" placeholder={tr.table.filterMin} className="h-8 text-sm"
                            value={filterDraft[`${fc.field}_min`] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [`${fc.field}_min`]: e.target.value }))} />
                          <span className="text-muted-foreground text-xs shrink-0">–</span>
                          <Input type="number" placeholder={tr.table.filterMax} className="h-8 text-sm"
                            value={filterDraft[`${fc.field}_max`] ?? ""} onChange={(e) => setFilterDraft((d) => ({ ...d, [`${fc.field}_max`]: e.target.value }))} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-5 py-4 border-t shrink-0">
                  <Button className="w-full h-9" onClick={applyFilters}>{tr.table.applyFilters}</Button>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {module && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm">
                  <Bookmark className="h-3.5 w-3.5" />
                  {tr.tools.views.button}
                  {savedViews.length > 0 && (
                    <Badge className="ms-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full">{savedViews.length}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>{tr.tools.views.title}</DropdownMenuLabel>
                {savedViews.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{tr.tools.views.none}</div>
                )}
                {savedViews.map((v) => (
                  <DropdownMenuItem key={v.id} onClick={() => applySavedView(v)} className="flex items-center justify-between gap-2">
                    <span className="truncate">{v.name}</span>
                    <button
                      type="button"
                      aria-label={`${tr.common.delete} ${v.name}`}
                      onClick={(e) => { e.stopPropagation(); removeSavedView(v.id); }}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={saveCurrentView}>
                  <Save className="h-3.5 w-3.5 me-2" /> {tr.tools.views.saveCurrent}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(activeFilters).map(([key, value]) => (
              <span key={key} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">
                {filterLabel(key, value)}
                <button type="button" aria-label={`${tr.common.delete} ${filterLabel(key, value)}`} onClick={() => removeFilter(key)} className="hover:text-destructive transition-colors ms-0.5 opacity-60 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              {tr.table.clearAll}
            </button>
          </div>
        )}
      </div>
      {/* ── Quick status tabs ── */}
      {quickStatusFilter && (
        <div
          role="tablist"
          aria-label={title}
          className="px-6 pt-3 flex items-center gap-0.5 overflow-x-auto shrink-0"
        >
          {[{ value: "all", label: tr.table.all }, ...quickStatusFilter.options].map(({ value, label }) => {
            const active = (searchParams.get(quickStatusFilter.field) ?? "all") === value;
            return (
              <button
                key={value}
                role="tab"
                aria-selected={active}
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
      {/* ── Bulk action bar ── */}
      {bulkConfig && selected.size > 0 && (
        <div className="px-6 pt-3 shrink-0">
          <BulkActionBar
            entity={bulkConfig.entity}
            ids={[...selected]}
            statusOptions={bulkConfig.statusOptions}
            queryKey={queryKey}
            onClear={clearSelection}
          />
        </div>
      )}
      {/* ── Table ── */}
      <Card className={cn("mx-6 mt-3 shadow-sm border-border/60 transition-opacity overflow-hidden", isPlaceholderData && !isPending ? "opacity-60" : "opacity-100")}>
        <CardContent className="p-0 overflow-auto">
        <Table className="max-md:block">
          <TableHeader className="max-md:hidden">
            <TableRow className="hover:bg-transparent bg-muted/30 border-b-2 border-border/60">
              {bulkConfig && (
                <TableHead className={SELECTION_CELL_CLASS}>
                  <div className={SELECTION_CHECKBOX_WRAP_CLASS}>
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every((i) => selected.has(i._id))}
                      onCheckedChange={(c) =>
                        setSelected((prev) => {
                          const n = new Set(prev);
                          if (c) filtered.forEach((i) => n.add(i._id));
                          else filtered.forEach((i) => n.delete(i._id));
                          return n;
                        })
                      }
                      aria-label="Select all"
                    />
                  </div>
                </TableHead>
              )}
              {headers.map((header, hi) => {
                const col = usingColumns ? columns![hi] : undefined;
                // With `columns`, sort identity is the stable `sortKey` — not the
                // translated label, which changes with the UI language.
                const sortId    = col ? col.sortKey : header;
                const isSortable = col ? Boolean(col.sortKey) : sortableHeaders?.includes(header);
                const isActive   = Boolean(sortId) && sortBy === sortId;
                const SortIcon   = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <TableHead
                    key={col?.id ?? header}
                    aria-sort={
                      isSortable
                        ? isActive
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={cn(
                      "h-9 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 whitespace-nowrap",
                      col?.kind === "number" && "text-end",
                      isSortable &&
                        "cursor-pointer select-none hover:text-foreground/80 transition-colors " +
                          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
                    )}
                    onClick={isSortable && sortId ? () => toggleSort(sortId) : undefined}
                  >
                    {/* Sorting was mouse-only: the handler sat on the <th>, which is
                        not focusable and has no key handler (SC 2.1.1 / 4.1.2). The
                        inner control carries the semantics so screen readers announce
                        a button and the existing aria-sort on the <th> still applies. */}
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortId) toggleSort(sortId);
                        }}
                        className="inline-flex items-center gap-1 uppercase tracking-wider focus:outline-none"
                      >
                        {header}
                        <SortIcon className={cn("h-3 w-3 shrink-0", isActive ? "text-foreground/70" : "opacity-30")} />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1">{header}</span>
                    )}
                  </TableHead>
                );
              })}
              <TableHead className="w-10">
                <span className="sr-only">{tr.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="max-md:block max-md:p-2 [&>tr:nth-child(even)]:bg-muted/[0.03] dark:[&>tr:nth-child(even)]:bg-muted/[0.08]">
            {isPending &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent animate-pulse max-md:block max-md:border max-md:rounded-md max-md:mb-2">
                  {bulkConfig && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  {headers.map((h, hi) => (
                    <TableCell key={h}>
                      <Skeleton className={cn("h-4", SKELETON_WIDTHS[(i + hi) % SKELETON_WIDTHS.length])} />
                    </TableCell>
                  ))}
                  <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
                </TableRow>
              ))}

            {!isPending && filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={headers.length + 1 + (bulkConfig ? 1 : 0)} className="text-center">
                  <EmptyState
                    className="py-20"
                    title={committedQ
                      ? (noSearchMessage ? noSearchMessage(committedQ) : tr.table.noResults(committedQ))
                      : (emptyMessage ?? tr.table.noData(title))}
                    description={!committedQ ? tr.table.getStarted(title) : undefined}
                    action={!committedQ && (
                      onAdd ? (
                        <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={onAdd}>
                          <PlusCircle className="h-3.5 w-3.5" />
                          {addLabel}
                        </Button>
                      ) : addLink ? (
                        <Link to={addLink}>
                          <Button size="sm" variant="outline" className="gap-1.5 mt-1">
                            <PlusCircle className="h-3.5 w-3.5" />
                            {addLabel}
                          </Button>
                        </Link>
                      ) : null
                    )}
                  />
                </TableCell>
              </TableRow>
            )}

            {/* `columns` path: the table renders its own cells, so a cell's mobile
                label comes from its own definition instead of being matched to
                `headers[N]` by child index. That index matching is what made
                column reordering and hiding impossible. */}
            {!isPending && usingColumns && filtered.map((item) => (
              <TableRow
                key={item._id}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={cn(
                  "max-md:block max-md:border max-md:rounded-md max-md:mb-2 max-md:bg-card max-md:shadow-sm max-md:overflow-hidden",
                  rowClassName?.(item),
                )}
              >
                {bulkConfig && (
                  <TableCell onClick={(e) => e.stopPropagation()} className={cn(SELECTION_CELL_CLASS, "max-md:py-2 max-md:px-3")}>
                    <div className={SELECTION_CHECKBOX_WRAP_CLASS}>
                      <Checkbox checked={selected.has(item._id)} onCheckedChange={() => toggleSelected(item._id)} aria-label="Select row" />
                    </div>
                  </TableCell>
                )}
                {columns!.map((col) => (
                  <TableCell
                    key={col.id}
                    data-label={col.mobileLabel ?? col.header}
                    // Mixed-direction user content (an English title inside an
                    // Arabic table) truncates at the wrong end without this.
                    dir={col.kind === "text" ? "auto" : undefined}
                    className={cn(
                      COLUMN_KIND_CLASS[col.kind ?? "text"],
                      "max-md:grid max-md:grid-cols-[7.5rem_1fr] max-md:items-start max-md:gap-3 max-md:px-3 max-md:py-2 max-md:w-auto max-md:max-w-none",
                      "max-md:before:content-[attr(data-label)] max-md:before:text-xs max-md:before:font-medium max-md:before:text-muted-foreground",
                    )}
                  >
                    {col.cell(item)}
                  </TableCell>
                ))}
                {renderActions && (
                  <TableCell onClick={(e) => e.stopPropagation()} data-label="Actions" className="w-px max-md:px-3 max-md:py-2">
                    {renderActions(item, handleDelete)}
                  </TableCell>
                )}
              </TableRow>
            ))}

            {/* Legacy path — callers not yet migrated to `columns`. */}
            {!isPending && !usingColumns && renderRow && filtered.map((item) => withMobileLabels(
              renderRow(item, handleDelete,
                bulkConfig ? (
                  <TableCell onClick={(e) => e.stopPropagation()} className={SELECTION_CELL_CLASS}>
                    <div className={SELECTION_CHECKBOX_WRAP_CLASS}>
                      <Checkbox checked={selected.has(item._id)} onCheckedChange={() => toggleSelected(item._id)} aria-label="Select row" />
                    </div>
                  </TableCell>
                ) : undefined,
              ),
              headers,
              Boolean(bulkConfig),
            ))}
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
