import { useQuery } from "@tanstack/react-query";
import { getTimeline } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { TimelineItem, TimelineEventType } from "@/types/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import {
  Handshake, ArrowRight, Trophy, AlertCircle,
  Banknote, Trash2, CheckSquare, CheckCircle2,
  UserPlus, Calendar, StickyNote, Zap, FileText, Receipt, XCircle,
} from "lucide-react";

interface Props {
  linkedTo: string;
  linkedModel: "Customer" | "Deal" | "Quote" | "Invoice" | "Expense" | "Product" | "Task" | "Lead" | "Project" | "Supplier" | "PurchaseOrder";
}

const EVENT_ICON: Record<TimelineEventType, React.ReactNode> = {
  "deal.created":       <Handshake className="h-3.5 w-3.5" />,
  "deal.updated":       <Zap className="h-3.5 w-3.5" />,
  "deal.stage_changed": <ArrowRight className="h-3.5 w-3.5" />,
  "deal.won":           <Trophy className="h-3.5 w-3.5" />,
  "deal.lost":          <AlertCircle className="h-3.5 w-3.5" />,
  "payment.received":   <Banknote className="h-3.5 w-3.5" />,
  "payment.deleted":    <Trash2 className="h-3.5 w-3.5" />,
  "task.created":       <CheckSquare className="h-3.5 w-3.5" />,
  "task.completed":     <CheckCircle2 className="h-3.5 w-3.5" />,
  "note.added":         <StickyNote className="h-3.5 w-3.5" />,
  "contact.created":    <UserPlus className="h-3.5 w-3.5" />,
  "contact.updated":    <Zap className="h-3.5 w-3.5" />,
  "quote.created":      <FileText className="h-3.5 w-3.5" />,
  "invoice.created":    <FileText className="h-3.5 w-3.5" />,
  "expense.created":    <Receipt className="h-3.5 w-3.5" />,
  "expense.approved":   <CheckCircle2 className="h-3.5 w-3.5" />,
  "expense.rejected":   <XCircle className="h-3.5 w-3.5" />,
  "activity.logged":    <Calendar className="h-3.5 w-3.5" />,
  "custom":             <Zap className="h-3.5 w-3.5" />,
};

const EVENT_COLOR: Record<TimelineEventType, string> = {
  "deal.created":       "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "deal.updated":       "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  "deal.stage_changed": "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  "deal.won":           "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  "deal.lost":          "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  "payment.received":   "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  "payment.deleted":    "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  "task.created":       "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  "task.completed":     "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
  "note.added":         "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  "contact.created":    "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "contact.updated":    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  "quote.created":      "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  "invoice.created":    "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "expense.created":    "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  "expense.approved":   "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  "expense.rejected":   "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  "activity.logged":    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "custom":             "bg-muted text-muted-foreground",
};

const ACTIVITY_TYPE_ICON: Record<string, string> = {
  call: "📞", meeting: "🤝", task: "✅", note: "📝", email: "📧",
};

function groupByDate(items: TimelineItem[]): { label: string; items: TimelineItem[] }[] {
  const groups: Record<string, TimelineItem[]> = {};
  for (const item of items) {
    const d = new Date(item.createdAt);
    const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "dd MMM yyyy");
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export function RecordTimeline({ linkedTo, linkedModel }: Props) {
  const { tr } = useLanguage();
  const t = tr.timeline;

  const { data, isPending } = useQuery({
    queryKey: ["timeline", linkedTo, linkedModel],
    queryFn: () => getTimeline({ linkedTo, linkedModel }),
    enabled: !!linkedTo
  });

  const items: TimelineItem[] = data?.data ?? [];
  const groups = groupByDate(items);

  if (isPending) {
    return (
      <div className="space-y-3 py-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
        {t.empty}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ label, items: groupItems }) => (
        <div key={label}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {label}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            {groupItems.map((item) => (
              <TimelineItemRow key={item._id} item={item} t={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineItemRow({
  item,
  t,
}: {
  item: TimelineItem;
  t: { events: Record<string, string>; system: string };
}) {
  const isActivity = item._sourceType === "activity";
  const eventType = item.eventType ?? "custom";
  const color = isActivity
    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
    : EVENT_COLOR[eventType] ?? EVENT_COLOR["custom"];

  const icon = isActivity ? (
    <span className="text-sm">{ACTIVITY_TYPE_ICON[item.type ?? ""] ?? "📌"}</span>
  ) : (
    EVENT_ICON[eventType] ?? EVENT_ICON["custom"]
  );

  const actor = item.triggeredBy?.name ?? item.createdBy?.name ?? t.system;
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          color
        )}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <p className={cn("text-sm leading-snug", item.isSystem && "text-muted-foreground")}>
          {isActivity ? item.title : (t.events[eventType] ? `${t.events[eventType]}: ${item.title}` : item.title)}
        </p>

        {item.payload && Object.keys(item.payload).length > 0 && (
          <PayloadChips payload={item.payload} eventType={eventType} />
        )}

        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        )}

        <p className="text-xs text-muted-foreground mt-0.5">
          <span title={format(new Date(item.createdAt), "dd MMM yyyy, HH:mm")}>
            {timeAgo}
          </span>
          {" · "}
          <span className={cn(item.isSystem && "italic")}>{actor}</span>
        </p>
      </div>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title", price: "Amount", currency: "Currency",
  priority: "Priority", probability: "Win Probability", source: "Source",
  category: "Category", dealType: "Deal Type", expectedCloseDate: "Expected Close",
  lostReason: "Lost Reason", name: "Name", email: "Email",
  phone: "Phone", mobile: "Mobile", location: "Location",
  status: "Status", gender: "Gender", notes: "Notes",
};

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "probability") return `${value}%`;
  if (field === "price") return Number(value).toLocaleString();
  if (field === "expectedCloseDate") {
    const d = value instanceof Date ? value : new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  return String(value);
}

function PayloadChips({
  payload,
  eventType,
}: {
  payload: Record<string, unknown>;
  eventType: string;
}) {
  if (eventType === "deal.stage_changed" || eventType === "deal.won" || eventType === "deal.lost") {
    return (
      <div className="flex items-center gap-1 mt-1 text-xs">
        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{String(payload.from)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="px-1.5 py-0.5 rounded bg-muted text-foreground capitalize font-medium">{String(payload.to)}</span>
      </div>
    );
  }
  if (eventType === "deal.updated" || eventType === "contact.updated") {
    const changes = payload.changes as Record<string, { from: unknown; to: unknown }> | undefined;
    if (!changes || Object.keys(changes).length === 0) return null;
    return (
      <div className="mt-1.5 space-y-1">
        {Object.entries(changes).map(([field, { from, to }]) => (
          <div key={field} className="flex items-center gap-1 text-xs flex-wrap">
            <span className="text-muted-foreground font-medium shrink-0">
              {FIELD_LABELS[field] ?? field}:
            </span>
            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground max-w-[120px] truncate capitalize">
              {formatFieldValue(field, from)}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary max-w-[120px] truncate capitalize font-medium">
              {formatFieldValue(field, to)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (eventType === "payment.received" || eventType === "payment.deleted") {
    return (
      <p className="text-xs text-muted-foreground mt-0.5">
        {String(payload.amount)} {String(payload.currency)}
        {payload.method ? ` · ${String(payload.method)}` : ""}
      </p>
    );
  }
  return null;
}
