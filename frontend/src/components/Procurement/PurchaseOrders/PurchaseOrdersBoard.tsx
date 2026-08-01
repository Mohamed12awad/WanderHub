import type React from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { KanbanBoardPage } from "@/components/common/KanbanBoardPage";
import type { KanbanColumn } from "@/components/common/GenericKanban";
import { getPurchaseOrders, updatePurchaseOrderStatus } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface PO { _id: string; poNumber: string; title: string; status: string; total?: number; currency?: string; supplier?: { name: string } | null }

const COLUMN_KEYS = ["draft", "sent", "confirmed", "received", "cancelled"];
const COLUMN_COLORS: Record<string, string> = {
  draft: "#94a3b8", sent: "#3b82f6", confirmed: "#6366f1", received: "#10b981", cancelled: "#f43f5e",
};

function Card({ po }: { po: PO }) {
  const { formatCurrency } = useLanguage();
  return (
    <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
      <Link to={`/procurement/purchase-orders/${po._id}`} onClick={(e) => e.stopPropagation()} className="block text-sm font-semibold hover:text-primary truncate">{po.poNumber}</Link>
      <p className="text-xs text-muted-foreground truncate mt-0.5">{po.title}{po.supplier?.name ? ` · ${po.supplier.name}` : ""}</p>
      {(po.total ?? 0) > 0 && <p className="text-sm font-bold tabular-nums mt-2">{formatCurrency(po.total!, po.currency ?? "EGP")}</p>}
    </div>
  );
}

export default function PurchaseOrdersBoard({ headerExtra }: { headerExtra?: React.ReactNode }) {
  const { tr } = useLanguage();
  const po = tr.purchaseOrders;
  const columns = useMemo<KanbanColumn[]>(
    () => COLUMN_KEYS.map((key) => ({ key, label: po.statuses[key], color: COLUMN_COLORS[key] })),
    [po],
  );
  return (
    <KanbanBoardPage<PO>
      title={po.title} description={po.boardDescription}
      queryKey="purchaseOrders" columns={columns} fetchAll={() => getPurchaseOrders({ limit: 200 })}
      updateStatus={updatePurchaseOrderStatus}
      renderCard={(item) => <Card po={item} />} emptyColumnLabel={po.emptyColumn}
      headerExtra={headerExtra}
    />
  );
}
