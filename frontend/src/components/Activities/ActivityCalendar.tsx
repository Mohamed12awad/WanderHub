import { useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, PlusCircle, CheckCircle2, Circle, Trash2,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getAllActivities, createActivity, updateActivity, deleteActivity } from "@/utils/api";
import { Activity, ActivityType } from "@/types/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { ActivityDetailDialog } from "./ActivityDetailDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const TYPE_DOT: Record<string, string> = {
  call:    "bg-blue-500",
  meeting: "bg-purple-500",
  task:    "bg-yellow-500",
  note:    "bg-slate-400",
  email:   "bg-emerald-500",
};

const TYPE_CHIP: Record<string, string> = {
  call:    "bg-blue-500   hover:bg-blue-600",
  meeting: "bg-purple-500 hover:bg-purple-600",
  task:    "bg-yellow-500 hover:bg-yellow-600",
  note:    "bg-slate-400  hover:bg-slate-500",
  email:   "bg-emerald-500 hover:bg-emerald-600",
};

const TYPE_EMOJIS: Record<string, string> = {
  call: "📞", meeting: "🤝", task: "✅", note: "📝", email: "📧",
};

const TYPE_CARD_BORDER: Record<string, string> = {
  call:    "border-l-blue-400",
  meeting: "border-l-purple-400",
  task:    "border-l-yellow-400",
  note:    "border-l-slate-300",
  email:   "border-l-emerald-400",
};

const ENTITY_ROUTES: Record<string, string> = {
  Customer: "/customers", Deal: "/deals", Project: "/projects",
  Lead: "/leads", Supplier: "/procurement/suppliers",
  PurchaseOrder: "/procurement/purchase-orders",
  Invoice: "/finance/invoices", Quote: "/finance/quotes",
};

function linkedEntityPath(a: Activity): { label: string; href: string } | null {
  if (a.customer) return { label: a.customer.name, href: `/customers/${a.customer._id}` };
  if (a.deal)     return { label: a.deal.title,    href: `/deals/${a.deal._id}` };
  if (a.project)  return { label: a.project.name,  href: `/projects/${a.project._id}` };
  const base = ENTITY_ROUTES[a.linkedModel];
  if (base && a.linkedTo) return { label: a.linkedModel, href: `${base}/${a.linkedTo}` };
  return null;
}

// ── Quick-add dialog ──────────────────────────────────────────────────────────
interface QuickAddProps {
  date: Date | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

function QuickAddDialog({ date, open, onOpenChange, onCreated }: QuickAddProps) {
  const { formatDate } = useLanguage();
  const { toast } = useToast();
  const [type,        setType]        = useState<ActivityType>("call");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [actDate,     setActDate]     = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: createActivity,

    onSuccess: () => {
      toast({ title: "Activity created." });
      setTitle(""); setDescription(""); setType("call");
      onCreated();
      onOpenChange(false);
    },

    onError: () => { toast({ title: "Failed to create activity.", variant: "destructive" }); }
  });

  const handleOpen = (v: boolean) => {
    if (v && date) setActDate(format(date, "yyyy-MM-dd"));
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutate({ type, title: title.trim(), description: description.trim() || undefined, date: actDate, status: "pending", linkedTo: "", linkedModel: "Customer" } as any);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            New activity {date ? `— ${formatDate(date, { weekday: "short", day: "2-digit", month: "short" })}` : ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-[80px_1fr] items-center gap-3">
              <Label className="text-sm">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["call", "meeting", "task", "note", "email"] as ActivityType[]).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {TYPE_EMOJIS[t]} {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[80px_1fr] items-center gap-3">
              <Label className="text-sm" htmlFor="qa-title">Title</Label>
              <Input
                id="qa-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8"
                placeholder="e.g. Follow-up call with client"
              />
            </div>
            <div className="grid grid-cols-[80px_1fr] items-center gap-3">
              <Label className="text-sm" htmlFor="qa-date">Date</Label>
              <Input
                id="qa-date"
                type="date"
                value={actDate}
                onChange={(e) => setActDate(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="grid grid-cols-[80px_1fr] items-start gap-3">
              <Label className="text-sm mt-1">Notes</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none text-sm"
                placeholder="Optional notes…"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main calendar ─────────────────────────────────────────────────────────────
export function ActivityCalendar() {
  const { tr, formatDate } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const c = tr.calendar;

  const [current,     setCurrent]     = useState(new Date());
  const [selected,    setSelected]    = useState<Date | null>(null);
  const [detail,      setDetail]      = useState<Activity | null>(null);
  const [detailOpen,  setDetailOpen]  = useState(false);
  const [addOpen,     setAddOpen]     = useState(false);
  const [showAllDay,  setShowAllDay]  = useState<Date | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);

  const queryKey = ["activities-calendar", current.getFullYear(), current.getMonth()];

  const { data, isPending } = useQuery({
    queryKey: queryKey,
    queryFn: () => getAllActivities({ month: current.getMonth() + 1, year: current.getFullYear() }),
    placeholderData: keepPreviousData
  });

  const activities: Activity[] = Array.isArray(data?.data) ? data.data : [];

  const invalidate = () => queryClient.invalidateQueries({
    queryKey: queryKey
  });

  const toggleMut = useMutation({
    mutationFn: (a: Activity) => updateActivity(a._id, {
      status: a.status === "completed" ? "pending" : "completed",
    } as any),

    onSuccess: invalidate,
    onError:   () => { toast({ title: "Failed to update.", variant: "destructive" }); }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: invalidate,
    onError:   () => { toast({ title: "Failed to delete.", variant: "destructive" }); }
  });

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const getForDay = (day: Date) => activities.filter((a) => isSameDay(new Date(a.date), day));

  const openDetail = (a: Activity, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDetail(a);
    setDetailOpen(true);
  };

  const selectedActivities = selected ? getForDay(selected) : [];
  const showAllActivities  = showAllDay ? getForDay(showAllDay) : [];

  return (
    <PageShell width="default">
      <PageHeader
        title={c.title}
        description={formatDate(current, { month: "long", year: "numeric" })}
        primaryAction={
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="gap-1.5 h-8"
              onClick={() => setAddOpen(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />New Activity
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous month" onClick={() => setCurrent(subMonths(current, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => { setCurrent(new Date()); setSelected(new Date()); }}>
              {c.today}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next month" onClick={() => setCurrent(addMonths(current, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Calendar grid */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {c.weekdays.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayActs    = isPending ? [] : getForDay(day);
              const isSelected = selected ? isSameDay(day, selected) : false;
              const inMonth    = isSameMonth(day, current);
              const visible    = dayActs.slice(0, 3);
              const overflow   = dayActs.length - 3;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(isSelected ? null : day)}
                  className={cn(
                    "min-h-[80px] p-1.5 text-left border-b border-e transition-colors hover:bg-muted/30 focus:outline-none",
                    !inMonth && "bg-muted/10",
                    isSelected && "bg-primary/5 ring-2 ring-inset ring-primary",
                  )}
                >
                  <span className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1",
                    isToday(day) && "bg-primary text-primary-foreground",
                    !inMonth && "text-muted-foreground/40",
                  )}>
                    {formatDate(day, { day: "numeric" })}
                  </span>

                  <div className="flex flex-col gap-0.5">
                    {visible.map((a) => {
                      const entity = linkedEntityPath(a);
                      return (
                        <button
                          key={a._id}
                          onClick={(e) => { e.stopPropagation(); openDetail(a); }}
                          className={cn(
                            "w-full rounded px-1 py-0.5 text-[10px] text-white leading-tight text-left transition-colors",
                            TYPE_CHIP[a.type] ?? "bg-slate-400 hover:bg-slate-500",
                            a.status === "completed" && "opacity-60 line-through",
                          )}
                          title={entity ? `${a.title} · ${entity.label}` : a.title}
                        >
                          <div className="truncate">{TYPE_EMOJIS[a.type]} {a.title}</div>
                          {entity && (
                            <div className="truncate opacity-80" style={{ fontSize: "9px" }}>{entity.label}</div>
                          )}
                        </button>
                      );
                    })}
                    {overflow > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAllDay(day); setSelected(day); }}
                        className="text-[10px] text-primary hover:underline ps-1 text-left"
                      >
                        +{overflow} more
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col h-fit">
          {selected ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">{formatDate(selected, { weekday: "short", month: "long", day: "numeric" })}</h2>
                <Button
                  size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                  onClick={() => setAddOpen(true)}
                >
                  <PlusCircle className="h-3 w-3" />Add
                </Button>
              </div>

              {selectedActivities.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <p>{c.noActivities}</p>
                  <Button
                    size="sm" variant="outline" className="mt-3 gap-1.5 h-7 text-xs"
                    onClick={() => setAddOpen(true)}
                  >
                    <PlusCircle className="h-3 w-3" />New activity
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedActivities.map((a) => {
                    const entity = linkedEntityPath(a);
                    return (
                      <li
                        key={a._id}
                        className={cn(
                          "border-l-4 rounded-r-lg border rounded-lg p-3 space-y-1 cursor-pointer hover:bg-muted/30 transition-colors",
                          TYPE_CARD_BORDER[a.type] ?? "border-l-slate-300",
                          a.status === "completed" && "opacity-60",
                        )}
                        onClick={() => openDetail(a)}
                        title="Click to view / edit"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn(
                            "text-sm font-medium leading-tight flex-1",
                            a.status === "completed" && "line-through text-muted-foreground",
                          )}>
                            {TYPE_EMOJIS[a.type]} {a.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] capitalize shrink-0",
                              a.status === "completed"
                                ? "border-emerald-500 text-emerald-600"
                                : "border-amber-500 text-amber-600")}
                          >
                            {a.status}
                          </Badge>
                        </div>
                        {a.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                        )}
                        {entity && (
                          <Link
                            to={entity.href}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            {entity.label}<ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                        {/* Inline quick actions */}
                        <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon" variant="ghost"
                            className={cn("h-6 w-6", a.status === "completed" && "text-emerald-600")}
                            title={a.status === "completed" ? "Mark pending" : "Mark done"}
                            onClick={() => toggleMut.mutate(a)}
                            disabled={toggleMut.isPending}
                          >
                            {a.status === "completed"
                              ? <CheckCircle2 className="h-3.5 w-3.5" />
                              : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={() => setDeleteId(a._id)}
                            disabled={deleteMut.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground text-center py-10">
              {c.clickDay}
            </div>
          )}

          {/* Legend */}
          <div className="px-4 pb-4 pt-2 border-t mt-auto">
            <p className="text-xs font-semibold text-muted-foreground mb-2">{c.legend}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {Object.keys(TYPE_DOT).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", TYPE_DOT[type])} />
                  <span className="text-xs capitalize">{TYPE_EMOJIS[type]} {c.types?.[type] ?? type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* All-activities overlay for +N overflow */}
      {showAllDay && (
        <Dialog open={!!showAllDay} onOpenChange={() => setShowAllDay(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>All activities — {formatDate(showAllDay, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</DialogTitle>
            </DialogHeader>
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {showAllActivities.map((a) => (
                <li
                  key={a._id}
                  className={cn(
                    "border-l-4 rounded-r-lg border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors",
                    TYPE_CARD_BORDER[a.type] ?? "border-l-slate-300",
                  )}
                  onClick={() => { setShowAllDay(null); openDetail(a); }}
                >
                  <span className="text-sm font-medium">
                    {TYPE_EMOJIS[a.type]} {a.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("ms-2 text-[10px] capitalize",
                      a.status === "completed"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-amber-500 text-amber-600")}
                  >
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}
      {/* Detail dialog */}
      <ActivityDetailDialog
        activity={detail}
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) setDetail(null); }}
        invalidateKeys={["activities-calendar"]}
      />
      <ConfirmDialog
        open={deleteId !== null}
        onConfirm={() => {
          const id = deleteId;
          setDeleteId(null);
          if (id) deleteMut.mutate(id);
        }}
        onCancel={() => setDeleteId(null)}
        title="Delete Activity"
        description="Delete this activity? This action cannot be undone."
      />
      {/* Quick-add dialog */}
      <QuickAddDialog
        date={selected}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={invalidate}
      />
    </PageShell>
  );
}
