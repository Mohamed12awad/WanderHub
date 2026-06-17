import type React from "react";
import { Link } from "react-router-dom";
import { KanbanBoardPage } from "@/components/common/KanbanBoardPage";
import type { KanbanColumn } from "@/components/common/GenericKanban";
import { getSalesOrders, updateSalesOrderStatus } from "@/utils/api";

interface SO { _id: string; orderNumber: string; title: string; status: string; total?: number; currency?: string; customer?: { name: string } | null }

const COLUMNS: KanbanColumn[] = [
  { key: "draft", label: "Draft", color: "#94a3b8" },
  { key: "confirmed", label: "Confirmed", color: "#3b82f6" },
  { key: "fulfilled", label: "Fulfilled", color: "#6366f1" },
  { key: "invoiced", label: "Invoiced", color: "#10b981" },
  { key: "cancelled", label: "Cancelled", color: "#f43f5e" },
];

function Card({ so }: { so: SO }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
      <Link to={`/sales-orders/${so._id}`} onClick={(e) => e.stopPropagation()} className="block text-sm font-semibold hover:text-primary truncate">{so.orderNumber}</Link>
      <p className="text-xs text-muted-foreground truncate mt-0.5">{so.title}{so.customer?.name ? ` · ${so.customer.name}` : ""}</p>
      {(so.total ?? 0) > 0 && <p className="text-sm font-bold tabular-nums mt-2">{so.total!.toLocaleString()} {so.currency ?? "EGP"}</p>}
    </div>
  );
}

export default function SalesOrdersBoard({ headerExtra }: { headerExtra?: React.ReactNode }) {
  return (
    <KanbanBoardPage<SO>
      title="Sales Orders" description="Drag an order between stages to update its status."
      queryKey="salesOrders" columns={COLUMNS} fetchAll={() => getSalesOrders({ limit: 200 })}
      updateStatus={updateSalesOrderStatus}
      renderCard={(so) => <Card so={so} />} emptyColumnLabel="No orders"
      headerExtra={headerExtra}
    />
  );
}
