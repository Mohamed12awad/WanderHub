import { useNavigate } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/common/RowActions";
import { SalesOrder } from "@/types/types";
import { format } from "date-fns";

interface Props {
  order: SalesOrder;
  handleDelete: (id: string) => void;
}

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "-" : format(d, "MMM d, yyyy");
}

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

export default function SalesOrderRow({ order, handleDelete }: Props) {
  const navigate = useNavigate();

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/sales-orders/${order._id}`)}>
      <TableCell dir="auto" className="font-medium">{order.orderNumber}</TableCell>
      <TableCell dir="auto">{order.customer?.name || "-"}</TableCell>
      <TableCell>
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </TableCell>
      <TableCell dir="auto" className="font-medium">
        {order.total.toLocaleString()} {order.currency}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {fmtDate(order.expectedDate)}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {fmtDate(order.createdAt)}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <RowActions
          viewHref={`/sales-orders/${order._id}`}
          editHref={`/sales-orders/${order._id}/edit`}
          onDelete={() => handleDelete(order._id)}
        />
      </TableCell>
    </TableRow>
  );
}
