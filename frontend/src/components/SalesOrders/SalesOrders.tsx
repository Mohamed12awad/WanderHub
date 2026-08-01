import { useState } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import { ViewSwitch } from "@/components/common/ViewSwitch";
import SalesOrdersBoard from "./SalesOrdersBoard";
import { deleteSalesOrder, getSalesOrders } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { SalesOrder } from "@/types/types";
import { useNavigate } from "react-router-dom";
import { RowActions } from "@/components/common/RowActions";

function getStatusColor(status: string) {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    case "confirmed": return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
    case "fulfilled": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400";
    case "invoiced": return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
    case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
    default: return "bg-gray-100 text-gray-700";
  }
}

export function SalesOrders() {
  const { tr, formatCurrency, formatDate } = useLanguage();
  const navigate = useNavigate();
  const s = tr.salesOrders;
  const [view, setView] = useState<"list" | "board">("list");
  const switcher = <ViewSwitch active={view} onChange={setView} />;
  const fmtDate = (value?: string | Date | null) => {
    if (!value) return "-";
    const date = new Date(value);
    return isNaN(date.getTime()) ? "-" : formatDate(date, { month: "short", day: "numeric", year: "numeric" });
  };

  if (view === "board") return <SalesOrdersBoard headerExtra={switcher} />;

  return (
    <GenericTable<SalesOrder>
      queryKey="salesOrders"
      headerExtra={switcher}
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getSalesOrders({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })
      }
      deleteData={deleteSalesOrder}
      columns={[
        { id: "orderNumber", header: s.headers[0], sortKey: "Order Number", kind: "text", hideable: false, cell: (order) => <span className="font-medium">{order.orderNumber}</span> },
        { id: "customer", header: s.headers[1], kind: "text", cell: (order) => order.customer?.name || "-" },
        { id: "status", header: s.headers[2], kind: "status", cell: (order) => <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>{order.status}</span> },
        { id: "total", header: s.headers[3], sortKey: "Total", kind: "number", cell: (order) => <span className="font-medium">{formatCurrency(order.total, order.currency)}</span> },
        { id: "expectedDate", header: s.headers[4], kind: "date", cell: (order) => <span className="text-muted-foreground whitespace-nowrap">{fmtDate(order.expectedDate)}</span> },
        { id: "createdAt", header: s.headers[5], sortKey: "Created", kind: "date", cell: (order) => <span className="text-muted-foreground whitespace-nowrap">{fmtDate(order.createdAt)}</span> },
      ]}
      onRowClick={(order) => navigate(`/sales-orders/${order._id}`)}
      renderActions={(order, handleDelete) => (
        <RowActions
          viewHref={`/sales-orders/${order._id}`}
          editHref={`/sales-orders/${order._id}/edit`}
          onDelete={() => handleDelete(order._id)}
        />
      )}
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "confirmed", label: "Confirmed" },
          { value: "fulfilled", label: "Fulfilled" },
          { value: "invoiced", label: "Invoiced" },
          { value: "cancelled", label: "Cancelled" },
        ],
      }}
      title={s.title}
      description={s.description}
      addLink="/sales-orders/new"
      addLabel={s.add}
    />
  );
}

export default SalesOrders;
