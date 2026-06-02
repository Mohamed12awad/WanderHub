import { useState } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import { getAllActivities } from "@/utils/api";
import { Activity, ActivityType } from "@/types/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityDetailDialog } from "@/components/Activities/ActivityDetailDialog";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "react-query";
import { updateActivity, deleteActivity } from "@/utils/api";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";

const TYPE_EMOJIS: Record<ActivityType, string> = {
  call: "📞", meeting: "🤝", task: "✅", note: "📝", email: "📧",
};

const TYPE_BORDER: Record<string, string> = {
  call: "border-l-blue-400", meeting: "border-l-purple-400",
  task: "border-l-yellow-400", note: "border-l-slate-300", email: "border-l-emerald-400",
};

const ENTITY_ROUTES: Record<string, string> = {
  Customer: "/customers", Deal: "/deals", Project: "/projects",
  Lead: "/leads", Supplier: "/procurement/suppliers",
  PurchaseOrder: "/procurement/purchase-orders",
  Invoice: "/finance/invoices", Quote: "/finance/quotes",
};

function entityLink(a: Activity): { label: string; href: string } | null {
  if (a.customer) return { label: a.customer.name, href: `/customers/${a.customer._id}` };
  if (a.deal)     return { label: a.deal.title,    href: `/deals/${a.deal._id}` };
  if (a.project)  return { label: a.project.name,  href: `/projects/${a.project._id}` };
  const base = ENTITY_ROUTES[a.linkedModel];
  if (base && a.linkedTo) return { label: a.linkedModel, href: `${base}/${a.linkedTo}` };
  return null;
}

export function ActivitiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search,      setSearch]     = useState("");
  const [typeFilter,  setTypeFilter] = useState<string>("all");
  const [statusFilter,setStatus]     = useState<string>("all");
  const [detail,      setDetail]     = useState<Activity | null>(null);
  const [detailOpen,  setDetailOpen] = useState(false);

  const queryKey = ["activities-all"];
  const { data, isLoading } = useQuery(queryKey, () => getAllActivities({}));
  const activities: Activity[] = Array.isArray(data?.data) ? data.data : [];

  const invalidate = () => queryClient.invalidateQueries(queryKey);

  const toggleMut = useMutation(
    (a: Activity) => updateActivity(a._id, {
      status: a.status === "completed" ? "pending" : "completed",
    } as any),
    { onSuccess: invalidate, onError: () => { toast({ title: "Failed to update.", variant: "destructive" }); } },
  );

  const deleteMut = useMutation(
    (id: string) => deleteActivity(id),
    { onSuccess: invalidate, onError: () => { toast({ title: "Failed to delete.", variant: "destructive" }); } },
  );

  const filtered = activities.filter((a) => {
    if (typeFilter !== "all"   && a.type   !== typeFilter)  return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const entity = entityLink(a);
      if (
        !a.title.toLowerCase().includes(q) &&
        !a.description?.toLowerCase().includes(q) &&
        !entity?.label.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Activities</h1>
          <p className="text-sm text-muted-foreground">{activities.length} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search activities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[130px] text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(["call", "meeting", "task", "note", "email"] as ActivityType[]).map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {TYPE_EMOJIS[t]} {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-[130px] text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || statusFilter !== "all" || search) && (
          <Button
            size="sm" variant="ghost" className="h-8 text-xs"
            onClick={() => { setTypeFilter("all"); setStatus("all"); setSearch(""); }}
          >
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ms-auto">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No activities found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const entity = entityLink(a);
            return (
              <div
                key={a._id}
                className={cn(
                  "flex items-start gap-0 border-l-4 rounded-r-lg border rounded-lg transition-colors cursor-pointer hover:bg-muted/30",
                  TYPE_BORDER[a.type] ?? "border-l-slate-300",
                  a.status === "completed" && "opacity-70",
                )}
                onClick={() => { setDetail(a); setDetailOpen(true); }}
              >
                <div className="flex-1 min-w-0 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl shrink-0">{TYPE_EMOJIS[a.type as ActivityType]}</span>
                    <span className={cn(
                      "font-medium text-sm",
                      a.status === "completed" && "line-through text-muted-foreground",
                    )}>
                      {a.title}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] capitalize",
                        a.status === "completed"
                          ? "border-emerald-500 text-emerald-600"
                          : "border-amber-500 text-amber-600")}
                    >
                      {a.status}
                    </Badge>
                    {entity && (
                      <Link
                        to={entity.href}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline ms-auto shrink-0"
                      >
                        {entity.label}<ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(a.date), "dd MMM yyyy")}
                    {a.createdBy && ` · by ${a.createdBy.name}`}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5 p-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon" variant="ghost"
                    className={cn("h-7 w-7", a.status === "completed" && "text-emerald-600")}
                    title={a.status === "completed" ? "Mark pending" : "Mark done"}
                    onClick={() => toggleMut.mutate(a)}
                    disabled={toggleMut.isLoading}
                  >
                    {a.status === "completed"
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Delete"
                    onClick={() => { if (confirm("Delete this activity?")) deleteMut.mutate(a._id); }}
                    disabled={deleteMut.isLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActivityDetailDialog
        activity={detail}
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) setDetail(null); }}
        invalidateKeys={["activities-all"]}
      />
    </div>
  );
}
