import { useState } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import { ViewSwitch } from "@/components/common/ViewSwitch";
import PurchaseOrdersBoard from "./PurchaseOrdersBoard";
import { deletePurchaseOrder, getPurchaseOrders } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { PurchaseOrder } from "@/types/types";
import type { FilterConfig } from "@/components/common/GenericTable";
import { useNavigate } from "react-router-dom";
import { RowActions } from "@/components/common/RowActions";

const PO_FILTERS: FilterConfig[] = [
  { label: "Issue Date", field: "issueDate", type: "date-range" },
  { label: "Expected Delivery", field: "expectedDeliveryDate", type: "date-range" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    case "sent": return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
    case "confirmed": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400";
    case "received": return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
    case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
    default: return "bg-gray-100 text-gray-700";
  }
}

export default function PurchaseOrders() {
  const { tr, formatCurrency, formatDate } = useLanguage();
  const navigate = useNavigate();
  const s = tr.purchaseOrders;
  const [view, setView] = useState<"list" | "board">("list");
  const switcher = <ViewSwitch active={view} onChange={setView} />;
  const fmtDate = (value?: string | Date | null) => {
    if (!value) return "-";
    const date = new Date(value);
    return isNaN(date.getTime()) ? "-" : formatDate(date, { month: "short", day: "numeric", year: "numeric" });
  };

  if (view === "board") return <PurchaseOrdersBoard headerExtra={switcher} />;

  return (
    <GenericTable<PurchaseOrder>
      queryKey="purchaseOrders"
      headerExtra={switcher}
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getPurchaseOrders({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })
      }
      deleteData={deletePurchaseOrder}
      columns={[
        { id: "poNumber", header: s.headers[0], kind: "text", hideable: false, cell: (order) => <span className="font-medium">{order.poNumber}</span> },
        { id: "supplier", header: s.headers[1], kind: "text", cell: (order) => order.supplier?.name || "-" },
        { id: "status", header: s.headers[2], kind: "status", cell: (order) => <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>{s.statuses[order.status] ?? order.status}</span> },
        { id: "total", header: s.headers[3], kind: "number", cell: (order) => <span className="font-medium">{formatCurrency(order.total, order.currency)}</span> },
        { id: "expectedDeliveryDate", header: s.headers[4], kind: "date", cell: (order) => <span className="text-muted-foreground whitespace-nowrap">{fmtDate((order as PurchaseOrder & { expectedDeliveryDate?: string; expectedDate?: string }).expectedDeliveryDate ?? (order as PurchaseOrder & { expectedDate?: string }).expectedDate)}</span> },
        { id: "createdAt", header: s.headers[5], kind: "date", cell: (order) => <span className="text-muted-foreground whitespace-nowrap">{fmtDate((order as PurchaseOrder & { issueDate?: string }).issueDate ?? order.createdAt)}</span> },
      ]}
      onRowClick={(order) => navigate(`/procurement/purchase-orders/${order._id}`)}
      renderActions={(order, handleDelete) => (
        <RowActions
          viewHref={`/procurement/purchase-orders/${order._id}`}
          editHref={`/procurement/purchase-orders/${order._id}/edit`}
          onDelete={() => handleDelete(order._id)}
        />
      )}
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "sent", label: "Sent" },
          { value: "confirmed", label: "Confirmed" },
          { value: "received", label: "Received" },
          { value: "cancelled", label: "Cancelled" },
        ],
      }}
      title={s.title}
      description={s.description}
      addLink="/procurement/purchase-orders/new"
      addLabel={s.add}
      filterConfigs={PO_FILTERS}
    />
  );
}
