import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useSearchParams } from "react-router-dom";
import { PlusCircle, Search, Download, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadCSV } from "@/utils/csv";
import { Pagination } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type DataItem = { _id: string; createdAt: string };

type PagedPayload<T> = { data: T[]; total: number; page: number; pages: number };

export type FilterConfig = {
  label: string;
  field: string;
  type: "select" | "date-range";
  options?: { label: string; value: string }[];
};

type GenericTableProps<T extends DataItem> = {
  queryKey: string;
  fetchData: (params: { page: number; limit: number; q: string; filters?: Record<string, string> }) => Promise<{ data: T[] | PagedPayload<T> }>;
  deleteData: (id: string) => Promise<void>;
  headers: string[];
  renderRow: (item: T, handleDelete: (id: string) => void) => JSX.Element;
  title: string;
  description: string;
  addLink: string;
  addLabel: string;
  emptyMessage?: string;
  noSearchMessage?: (q: string) => string;
  exportConfig?: {
    filename: string;
    getRow: (item: T) => Record<string, unknown>;
  };
  filterConfigs?: FilterConfig[];
};

export function GenericTable<T extends DataItem>({
  queryKey,
  fetchData,
  deleteData,
  headers,
  renderRow,
  title,
  description,
  addLink,
  addLabel,
  emptyMessage,
  noSearchMessage,
  exportConfig,
  filterConfigs,
}: GenericTableProps<T>) {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Committed URL state (drives react-query cache key)
  const committedQ = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "25")));

  // Read active filters from URL params
  const activeFilters: Record<string, string> = {};
  if (filterConfigs) {
    for (const fc of filterConfigs) {
      if (fc.type === "date-range") {
        const from = searchParams.get(`${fc.field}_from`);
        const to = searchParams.get(`${fc.field}_to`);
        if (from) activeFilters[`${fc.field}_from`] = from;
        if (to) activeFilters[`${fc.field}_to`] = to;
      } else {
        const val = searchParams.get(fc.field);
        if (val) activeFilters[fc.field] = val;
      }
    }
  }
  const activeFilterCount = Object.keys(activeFilters).length;

  // Local input state for instant feedback, debounced to URL
  const [localSearch, setLocalSearch] = useState(committedQ);
  // Local state for filter popover draft (not committed until "Apply")
  const [filterDraft, setFilterDraft] = useState<Record<string, string>>(activeFilters);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (localSearch) { next.set("q", localSearch); } else { next.delete("q"); }
        next.set("page", "1");
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      return next;
    }, { replace: true });
  };

  const setLimit = (l: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("limit", String(l));
      next.set("page", "1");
      return next;
    }, { replace: true });
  };

  const applyFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      if (!filterConfigs) return next;
      for (const fc of filterConfigs) {
        if (fc.type === "date-range") {
          const from = filterDraft[`${fc.field}_from`];
          const to = filterDraft[`${fc.field}_to`];
          if (from) { next.set(`${fc.field}_from`, from); } else { next.delete(`${fc.field}_from`); }
          if (to) { next.set(`${fc.field}_to`, to); } else { next.delete(`${fc.field}_to`); }
        } else {
          const val = filterDraft[fc.field];
          if (val && val !== "__all__") { next.set(fc.field, val); } else { next.delete(fc.field); }
        }
      }
      return next;
    }, { replace: true });
    setPopoverOpen(false);
  };

  const removeFilter = (key: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      next.set("page", "1");
      return next;
    }, { replace: true });
    setFilterDraft((d) => { const n = { ...d }; delete n[key]; return n; });
  };

  const clearAllFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (filterConfigs) {
        for (const fc of filterConfigs) {
          if (fc.type === "date-range") {
            next.delete(`${fc.field}_from`);
            next.delete(`${fc.field}_to`);
          } else {
            next.delete(fc.field);
          }
        }
      }
      next.set("page", "1");
      return next;
    }, { replace: true });
    setFilterDraft({});
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data, isLoading, error, isPreviousData } = useQuery(
    [queryKey, page, limit, committedQ, JSON.stringify(activeFilters)],
    () => fetchData({ page, limit, q: committedQ, filters: activeFilters }),
    { keepPreviousData: true }
  );

  const mutation = useMutation(deleteData, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKey);
      toast({ title: tr.common.deleted });
    },
    onError: () => {
      toast({ title: tr.common.deleteFailed, variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => setPendingDeleteId(id);
  const confirmDelete = () => {
    if (pendingDeleteId) {
      mutation.mutate(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-destructive text-sm">
        Error loading {title.toLowerCase()}.
      </div>
    );
  }

  // Detect whether backend returned a paginated envelope or a flat array
  const rawPayload = data?.data;
  const isPaged = rawPayload !== undefined && !Array.isArray(rawPayload) && "data" in rawPayload;
  const dataList: T[] = isPaged
    ? (rawPayload as PagedPayload<T>).data
    : Array.isArray(rawPayload) ? rawPayload : [];
  const paginationInfo: PagedPayload<T> | null = isPaged ? (rawPayload as PagedPayload<T>) : null;

  // Client-side filtering is only used when backend returned a flat array
  const filtered = isPaged
    ? dataList
    : committedQ
      ? dataList.filter((item) =>
          Object.values(item).some(
            (v) => typeof v === "string" && v.toLowerCase().includes(committedQ.toLowerCase())
          )
        )
      : dataList;

  // Human-readable label for an active filter chip
  const filterLabel = (key: string, value: string): string => {
    if (!filterConfigs) return `${key}: ${value}`;
    for (const fc of filterConfigs) {
      if (fc.type === "date-range") {
        if (key === `${fc.field}_from`) return `${fc.label} from: ${value}`;
        if (key === `${fc.field}_to`) return `${fc.label} to: ${value}`;
      } else if (fc.field === key) {
        const opt = fc.options?.find((o) => o.value === value);
        return `${fc.label}: ${opt?.label ?? value}`;
      }
    }
    return `${key}: ${value}`;
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <ConfirmDialog
        open={!!pendingDeleteId}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={`${tr.common.search} ${title.toLowerCase()}…`}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="ps-8 h-9 bg-background"
          />
        </div>

        {filterConfigs && filterConfigs.length > 0 && (
          <Popover open={popoverOpen} onOpenChange={(o) => { setPopoverOpen(o); if (o) setFilterDraft(activeFilters); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ms-1 h-4 px-1 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-4">
              {filterConfigs.map((fc) => (
                <div key={fc.field} className="space-y-1">
                  <Label className="text-xs font-medium">{fc.label}</Label>
                  {fc.type === "select" && (
                    <Select
                      value={filterDraft[fc.field] ?? "__all__"}
                      onValueChange={(v) =>
                        setFilterDraft((d) => ({ ...d, [fc.field]: v === "__all__" ? "" : v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={`Any ${fc.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Any</SelectItem>
                        {fc.options?.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {fc.type === "date-range" && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={filterDraft[`${fc.field}_from`] ?? ""}
                        onChange={(e) =>
                          setFilterDraft((d) => ({ ...d, [`${fc.field}_from`]: e.target.value }))
                        }
                      />
                      <span className="text-muted-foreground text-xs">–</span>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={filterDraft[`${fc.field}_to`] ?? ""}
                        onChange={(e) =>
                          setFilterDraft((d) => ({ ...d, [`${fc.field}_to`]: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={applyFilters}>Apply</Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setFilterDraft({}); }}
                >
                  Reset
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className="ms-auto flex items-center gap-2">
          {exportConfig && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() =>
                downloadCSV(filtered.map(exportConfig.getRow), exportConfig.filename)
              }
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tr.common.exportCsv}</span>
            </Button>
          )}
          <Link to={addLink}>
            <Button size="sm" className="h-9 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          </Link>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(activeFilters).map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="gap-1 pe-1 text-xs font-normal"
            >
              {filterLabel(key, value)}
              <button
                onClick={() => removeFilter(key)}
                className="ms-0.5 rounded-sm opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline ms-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table card */}
      <Card className={["shadow-sm", isPreviousData && !isLoading ? "opacity-70" : ""].join(" ")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {headers.map((header, i) => (
                  <TableHead
                    key={header}
                    className={[
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      i > 1 ? "hidden md:table-cell" : "",
                    ].join(" ")}
                  >
                    {header}
                  </TableHead>
                ))}
                <TableHead>
                  <span className="sr-only">{tr.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {headers.map((h, hi) => (
                      <TableCell key={h} className={hi > 1 ? "hidden md:table-cell" : ""}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={headers.length + 1}
                    className="text-center py-16 text-muted-foreground text-sm"
                  >
                    {committedQ
                      ? (noSearchMessage ? noSearchMessage(committedQ) : `${tr.common.noResults} "${committedQ}"`)
                      : (emptyMessage ?? `No ${title.toLowerCase()} yet.`)}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && filtered.map((item) => renderRow(item, handleDelete))}
            </TableBody>
          </Table>

          {paginationInfo && (
            <Pagination
              page={paginationInfo.page}
              pages={paginationInfo.pages}
              total={paginationInfo.total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
