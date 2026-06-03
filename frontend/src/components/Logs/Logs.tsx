import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getLogs, getUsers } from "@/utils/api";
import { LogEntry } from "@/types/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { Search, UserCircle, ChevronLeft, ChevronRight, CalendarRange, Inbox, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────────

function actionType(action: string): "create" | "delete" | "update" | "auth" {
  const a = action.toLowerCase();
  if (a.startsWith("created") || a.startsWith("recorded")) return "create";
  if (a.startsWith("deleted") || a.startsWith("removed"))  return "delete";
  if (a.startsWith("logged") || a.startsWith("authentication") || a.startsWith("changed a password")) return "auth";
  return "update";
}

const TYPE_CONFIG = {
  create: { dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800", label: "Created" },
  update: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800", label: "Updated" },
  delete: { dot: "bg-red-500",   badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",           label: "Deleted" },
  auth:   { dot: "bg-blue-500",  badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",      label: "Auth"    },
};

// Maps an API endpoint + recordId to the corresponding frontend route.
// Strips the /api global prefix so both old logs (stored with /api/...) and
// new logs (stored without it) match correctly.
function recordLink(endpoint: string, recordId?: string): string | null {
  if (!recordId) return null;
  const path = endpoint.split("?")[0].replace(/^\/api/, "");
  if (/^\/customers/.test(path))         return `/customers/${recordId}`;
  if (/^\/deals/.test(path))             return `/deals/${recordId}`;
  if (/^\/products/.test(path))          return `/products/${recordId}`;
  if (/^\/expenses/.test(path))          return `/expenses/${recordId}`;
  if (/^\/finance\/invoices/.test(path)) return `/finance/invoices/${recordId}`;
  if (/^\/finance\/quotes/.test(path))   return `/finance/quotes/${recordId}`;
  return null;
}

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function RelativeTime({ ts }: { ts: string }) {
  const date = new Date(ts);
  return (
    <span title={format(date, "dd MMM yyyy, HH:mm:ss")} className="text-xs text-muted-foreground whitespace-nowrap cursor-default tabular-nums">
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTION_TYPE_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "auth",    label: "Auth"    },
];

const PAGE_SIZE = 50;

// ── Component ──────────────────────────────────────────────────────────────────

export function Logs() {
  const { tr } = useLanguage();

  const [startDate,      setStartDate]      = useState("");
  const [endDate,        setEndDate]        = useState("");
  const [search,         setSearch]         = useState("");
  const [activeType,     setActiveType]     = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [page,           setPage]           = useState(1);

  const { data, isPending, error } = useQuery({
    queryKey: ["logs", startDate, endDate, activeType, selectedUserId, page],

    queryFn: () => getLogs({
      startDate:  startDate  || undefined,
      endDate:    endDate    || undefined,
      actionType: activeType !== "all" ? activeType : undefined,
      user:       selectedUserId !== "all" ? selectedUserId : undefined,
      page,
      limit: PAGE_SIZE,
    }),

    placeholderData: keepPreviousData
  });

  // Users for the filter dropdown
  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers(),
    staleTime: 60_000
  });
  const users: { _id: string; name: string }[] = usersData?.data ?? [];

  const raw: LogEntry[] = Array.isArray(data?.data) ? data.data : (data?.data?.data ?? []);
  const paginationInfo  = data?.data && !Array.isArray(data.data) ? data.data : null;
  const totalPages      = paginationInfo?.pages ?? 1;

  const logs = search.trim()
    ? raw.filter((l) => {
        const s = search.toLowerCase();
        return l.action.toLowerCase().includes(s) || l.user?.name?.toLowerCase().includes(s);
      })
    : raw;

  const resetPage = () => setPage(1);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>{tr.logs.title}</CardTitle>
          <CardDescription>{tr.logs.description}</CardDescription>

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-3 pt-3">

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search action or user…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-8 h-8 text-sm"
              />
            </div>

            {/* User filter */}
            <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); resetPage(); }}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id} className="text-xs">{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Label htmlFor="log-start" className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
              <Input id="log-start" type="date" value={startDate}
                onChange={(e) => { setStartDate(e.target.value); resetPage(); }}
                className="h-8 w-32 text-xs" />
              <Label htmlFor="log-end" className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
              <Input id="log-end" type="date" value={endDate}
                onChange={(e) => { setEndDate(e.target.value); resetPage(); }}
                className="h-8 w-32 text-xs" />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(""); setEndDate(""); resetPage(); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Action type tabs ── */}
          <div className="flex items-center gap-1 pt-1 flex-wrap">
            {[{ value: "all", label: "All" }, ...ACTION_TYPE_OPTIONS].map(({ value, label }) => {
              const active = activeType === value;
              const cfg    = value !== "all" ? TYPE_CONFIG[value as keyof typeof TYPE_CONFIG] : null;
              return (
                <button
                  key={value}
                  onClick={() => { setActiveType(value); resetPage(); }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {cfg && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
                  {label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!!error && (
            <p className="px-6 pb-6 text-sm text-destructive">{tr.logs.errorLoading}</p>
          )}

          {isPending && (
            <div className="px-6 pb-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-56" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          )}

          {!isPending && logs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                {search ? `No results for "${search}"` : tr.logs.noLogs}
              </p>
            </div>
          )}

          {!isPending && logs.length > 0 && (
            <ul className="divide-y divide-border/60">
              {logs.map((log) => {
                const type   = actionType(log.action);
                const config = TYPE_CONFIG[type];
                const name   = log.user?.name;
                // Don't link to deleted records — they no longer exist
                const link   = type !== "delete" ? recordLink(log.endpoint, log.recordId) : null;

                return (
                  <li key={log._id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">

                    {/* User avatar */}
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground select-none">
                      {name ? initials(name) : <UserCircle className="h-4 w-4" />}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">
                          {name ?? <span className="italic text-muted-foreground">Deleted user</span>}
                        </span>
                        {" "}
                        <span className="text-muted-foreground">{log.action.toLowerCase()}</span>
                        {log.recordName && (
                          <>
                            {": "}
                            {link ? (
                              <Link
                                to={link}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-primary hover:underline"
                              >
                                {log.recordName}
                              </Link>
                            ) : (
                              <span className="font-medium">{log.recordName}</span>
                            )}
                          </>
                        )}
                        {!log.recordName && link && (
                          <>
                            {" "}
                            <Link
                              to={link}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 text-primary hover:underline text-xs font-medium"
                              title="View record"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </Link>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Action type badge */}
                    <Badge variant="outline" className={`text-[10px] h-5 px-2 shrink-0 hidden sm:flex ${config.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full me-1.5 ${config.dot}`} />
                      {config.label}
                    </Badge>

                    {/* Relative time */}
                    <RelativeTime ts={log.timestamp} />
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination */}
          {!isPending && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
              <span className="text-xs">
                Page {page} of {totalPages}
                {paginationInfo?.total != null && ` · ${paginationInfo.total.toLocaleString()} entries`}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
