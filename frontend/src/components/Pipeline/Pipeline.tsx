import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDeals, updateDeal } from "@/utils/api";
import { Link } from "react-router-dom";
import { DealData } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, GripVertical, TrendingUp, Calendar, User } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";

interface Deal {
  _id: string;
  title: string;
  customer: { name: string } | string;
  product?: { name: string } | string;
  owner?: { name: string } | string;
  status: string;
  price?: number;
  value?: number;
  currency: string;
  createdAt: string;
  expectedCloseDate?: string;
  priority?: string;
}

const STATUSES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"] as const;
type DealStatus = (typeof STATUSES)[number];

const STATUS_META: Record<DealStatus, { bg: string; text: string; badge: string; dot: string }> = {
  lead:        { bg: "bg-blue-500",    text: "text-blue-600",    badge: "bg-blue-50 text-blue-700 border-blue-200",    dot: "bg-blue-500"    },
  qualified:   { bg: "bg-violet-500",  text: "text-violet-600",  badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500"  },
  proposal:    { bg: "bg-amber-500",   text: "text-amber-600",   badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500"   },
  negotiation: { bg: "bg-orange-500",  text: "text-orange-600",  badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500"  },
  won:         { bg: "bg-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  lost:        { bg: "bg-red-500",     text: "text-red-600",     badge: "bg-red-50 text-red-700 border-red-200",         dot: "bg-red-500"     },
  cancelled:   { bg: "bg-slate-400",   text: "text-slate-500",   badge: "bg-slate-50 text-slate-600 border-slate-200",   dot: "bg-slate-400"   },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500",
  high:   "text-orange-500",
  medium: "text-amber-500",
  low:    "text-slate-400",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(amount) + " " + currency;
}

function customerName(c: Deal["customer"]) {
  return typeof c === "object" && c ? c.name : (c ?? "—");
}
function ownerInitials(o: Deal["owner"]) {
  const name = typeof o === "object" && o ? o.name : (o ?? "");
  return name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

// ── Draggable Deal Card ────────────────────────────────────────────────────────

function DealCard({ deal, isDragging }: { deal: Deal; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal._id });
  const value = deal.value ?? deal.price ?? 0;
  const priority = deal.priority;

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-card border border-border/60 rounded-xl p-3 shadow-sm transition-all select-none",
        isDragging ? "opacity-40" : "hover:shadow-md hover:border-border",
      )}
    >
      {/* drag handle + title row */}
      <div className="flex items-start gap-1.5">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors shrink-0 touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <Link
            to={`/deals/${deal._id}`}
            className="block text-sm font-semibold leading-snug hover:text-primary transition-colors truncate"
          >
            {deal.title}
          </Link>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{customerName(deal.customer)}</p>
        </div>
      </div>

      {/* value */}
      {value > 0 && (
        <div className="flex items-center gap-1 mt-2.5">
          <TrendingUp className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <span className="text-sm font-bold tabular-nums">{formatCurrency(value, deal.currency)}</span>
        </div>
      )}

      {/* footer meta */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-border/40">
        <div className="flex items-center gap-1.5 min-w-0">
          {deal.expectedCloseDate && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
              <Calendar className="h-3 w-3" />
              {new Date(deal.expectedCloseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </span>
          )}
          {priority && priority !== "medium" && (
            <span className={cn("text-[10px] font-semibold capitalize", PRIORITY_COLORS[priority])}>
              {priority}
            </span>
          )}
        </div>
        {deal.owner && (
          <span
            className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0"
            title={typeof deal.owner === "object" ? deal.owner?.name : deal.owner}
          >
            {ownerInitials(deal.owner)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Ghost card shown over the drag overlay ────────────────────────────────────

function DealCardGhost({ deal }: { deal: Deal }) {
  const value = deal.value ?? deal.price ?? 0;
  return (
    <div className="bg-card border border-primary/40 rounded-xl p-3 shadow-xl rotate-1 w-64 opacity-95">
      <p className="text-sm font-semibold truncate">{deal.title}</p>
      <p className="text-xs text-muted-foreground truncate">{customerName(deal.customer)}</p>
      {value > 0 && <p className="text-sm font-bold mt-1">{formatCurrency(value, deal.currency)}</p>}
    </div>
  );
}

// ── Droppable Column ──────────────────────────────────────────────────────────

function Column({
  status,
  deals,
  label,
  customColor,
  isLoading,
  onAddDeal,
}: {
  status: DealStatus;
  deals: Deal[];
  label: string;
  customColor?: string;
  isLoading: boolean;
  onAddDeal: (status: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  const total = deals.reduce((s, d) => s + (d.value ?? d.price ?? 0), 0);
  const currency = deals[0]?.currency ?? "EGP";

  return (
    <div className="flex-shrink-0 w-64 flex flex-col">
      {/* Column header */}
      <div
        className={cn("rounded-t-xl px-3 py-2.5 flex items-center justify-between", !customColor && meta.bg)}
        style={customColor ? { background: customColor } : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{label}</span>
          <span className="bg-white/25 text-white text-xs font-medium rounded-full px-2 py-0.5">
            {isLoading ? "…" : deals.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-white/85 text-[11px] font-medium tabular-nums">
            {formatCurrency(total, currency)}
          </span>
        )}
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-b-xl p-2 min-h-[300px] space-y-2 transition-colors",
          isOver ? "bg-primary/8 ring-2 ring-primary/30 ring-inset" : "bg-muted/30 dark:bg-muted/15",
        )}
      >
        {isLoading && Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}

        {!isLoading && deals.map((deal) => (
          <DealCard key={deal._id} deal={deal} />
        ))}

        {!isLoading && deals.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-1">
            <div
              className={cn("h-2 w-2 rounded-full opacity-40", !customColor && meta.dot)}
              style={customColor ? { background: customColor } : undefined}
            />
            <p className="text-[11px] text-muted-foreground/60">No deals</p>
          </div>
        )}

        {/* Add deal button */}
        <button
          onClick={() => onAddDeal(status)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors border border-dashed border-border/40 hover:border-border mt-1"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Add deal
        </button>
      </div>
    </div>
  );
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

export function Pipeline() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: wsData } = useWorkspaceSettings();

  // Build a lookup of key → {label, color} from saved pipeline stages
  const stageOverrides = useMemo(() => {
    const saved: { key: string; label: string; color: string }[] = wsData?.pipelineStages ?? [];
    return Object.fromEntries(saved.map((s) => [s.key, s]));
  }, [wsData]);

  const { data, isPending, error } = useQuery({
    queryKey: ["deals"],
    queryFn: () => getDeals()
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateDeal(id, { status } as DealData),

    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] })
  });

  const deals: Deal[] = Array.isArray(data?.data) ? data.data : [];

  const grouped = useMemo(
    () =>
      STATUSES.reduce<Record<DealStatus, Deal[]>>(
        (acc, s) => { acc[s] = deals.filter((d) => d.status === s); return acc; },
        {} as Record<DealStatus, Deal[]>
      ),
    [deals]
  );

  const totalValue = deals.reduce((s, d) => s + (d.value ?? d.price ?? 0), 0);
  const currency = deals[0]?.currency ?? "EGP";
  const activeDeal = activeId ? deals.find((d) => d._id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const deal = deals.find((d) => d._id === active.id);
    if (!deal) return;
    const newStatus = String(over.id) as DealStatus;
    if (STATUSES.includes(newStatus) && deal.status !== newStatus) {
      moveMutation.mutate({ id: deal._id, status: newStatus });
    }
  };

  const handleAddDeal = (status: string) => {
    window.location.href = `/deals/add?status=${status}`;
  };

  if (error) return <div className="p-6 text-sm text-destructive">Error loading pipeline.</div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">{tr.pipeline.title}</h1>
          <p className="text-sm text-muted-foreground">{tr.pipeline.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          {deals.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Pipeline value</p>
              <p className="text-base font-bold tabular-nums">{formatCurrency(totalValue, currency)}</p>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {isPending ? "…" : deals.length} deals
          </div>
        </div>
      </div>
      {/* Board */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 min-w-max">
            {STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                deals={grouped[status]}
                label={stageOverrides[status]?.label ?? tr.pipeline.stages[status] ?? status}
                customColor={stageOverrides[status]?.color}
                isLoading={isPending}
                onAddDeal={handleAddDeal}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
            {activeDeal ? <DealCardGhost deal={activeDeal} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
