import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getDeals, updateDeal } from "@/utils/api";
import { Link } from "react-router-dom";
import { DealData } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { cn } from "@/lib/utils";
import { TrendingUp, Calendar, User } from "lucide-react";
import { GenericKanban, type KanbanColumn } from "@/components/common/GenericKanban";

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

interface PipelineStage { key: string; label: string; color: string; isWin?: boolean; isLoss?: boolean; }

// Used only when the workspace hasn't configured stages yet.
const FALLBACK_STAGES: PipelineStage[] = [
  { key: "lead",        label: "Lead",        color: "#3b82f6" },
  { key: "qualified",   label: "Qualified",   color: "#8b5cf6" },
  { key: "proposal",    label: "Proposal",    color: "#f59e0b" },
  { key: "negotiation", label: "Negotiation", color: "#f97316" },
  { key: "won",         label: "Won",         color: "#10b981", isWin: true },
  { key: "lost",        label: "Lost",        color: "#ef4444", isLoss: true },
  { key: "cancelled",   label: "Cancelled",   color: "#94a3b8", isLoss: true },
];

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

const dealValue = (d: Deal) => d.value ?? d.price ?? 0;

// ── Deal card ─────────────────────────────────────────────────────────────────
function DealCard({ deal }: { deal: Deal }) {
  const value = dealValue(deal);
  const priority = deal.priority;

  return (
    <div className="group bg-card border border-border/60 rounded-xl p-3 shadow-sm transition-all hover:shadow-md hover:border-border">
      <div className="min-w-0">
        <Link
          to={`/deals/${deal._id}`}
          onClick={(e) => e.stopPropagation()}
          className="block text-sm font-semibold leading-snug hover:text-primary transition-colors truncate"
        >
          {deal.title}
        </Link>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{customerName(deal.customer)}</p>
      </div>

      {value > 0 && (
        <div className="flex items-center gap-1 mt-2.5">
          <TrendingUp className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <span className="text-sm font-bold tabular-nums">{formatCurrency(value, deal.currency)}</span>
        </div>
      )}

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

// Ghost shown under the drag overlay.
function DealCardGhost({ deal }: { deal: Deal }) {
  const value = dealValue(deal);
  return (
    <div className="bg-card border border-primary/40 rounded-xl p-3 shadow-xl rotate-1 w-64 opacity-95">
      <p className="text-sm font-semibold truncate">{deal.title}</p>
      <p className="text-xs text-muted-foreground truncate">{customerName(deal.customer)}</p>
      {value > 0 && <p className="text-sm font-bold mt-1">{formatCurrency(value, deal.currency)}</p>}
    </div>
  );
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
export function Pipeline() {
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: wsData } = useWorkspaceSettings();

  // Columns are driven by the workspace's configured stages (order, labels,
  // colors), falling back to defaults until stages are configured.
  const stages: PipelineStage[] = useMemo(() => {
    const saved = (wsData?.pipelineStages as PipelineStage[] | undefined) ?? [];
    return saved.length ? saved : FALLBACK_STAGES;
  }, [wsData]);

  const columns: KanbanColumn[] = useMemo(
    () => stages.map((s) => ({ key: s.key, label: s.label ?? tr.pipeline.stages[s.key] ?? s.key, color: s.color || "#64748b" })),
    [stages, tr],
  );

  const { data, isPending, error } = useQuery({
    queryKey: ["deals"],
    queryFn: () => getDeals(),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateDeal(id, { status } as DealData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });

  const deals: Deal[] = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data?.data]);

  const totalValue = deals.reduce((s, d) => s + dealValue(d), 0);
  const currency = deals[0]?.currency ?? "EGP";

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
      <div className="flex-1 min-h-0 px-6 pb-6">
        <GenericKanban<Deal>
          items={deals}
          columns={columns}
          groupBy={(d) => d.status}
          getId={(d) => d._id}
          isLoading={isPending}
          onMove={(id, status) => moveMutation.mutate({ id, status })}
          renderCard={(deal) => <DealCard deal={deal} />}
          renderOverlay={(deal) => <DealCardGhost deal={deal} />}
          columnHeaderExtra={(colDeals) => {
            const total = colDeals.reduce((s, d) => s + dealValue(d), 0);
            return total > 0 ? formatCurrency(total, colDeals[0]?.currency ?? currency) : null;
          }}
          onAddTo={(status) => navigate(`/deals/add?status=${status}`)}
          addLabel="Add deal"
          emptyColumnLabel="No deals"
        />
      </div>
    </div>
  );
}
