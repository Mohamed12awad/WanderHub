import { useNavigate } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/common/RowActions";
import { PurchaseOrder } from "@/types/types";
import { format } from "date-fns";

interface Props {
  po: PurchaseOrder;
  handleDelete: (id: string) => void;
}

/** Formats a date, returning "-" for missing or invalid values (avoids date-fns "Invalid time value" crashes). */
function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "-" : format(d, "MMM d, yyyy");
}

export default function PurchaseOrderRow({ po, handleDelete }: Props) {
  const navigate = useNavigate();
  const expected = (po as any).expectedDeliveryDate ?? (po as any).expectedDate;
  const orderDate = (po as any).issueDate ?? (po as any).createdAt;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
      case "sent": return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
      case "confirmed": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400";
      case "received": return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
      case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/procurement/purchase-orders/${po._id}`)}>
      <TableCell className="font-medium">{po.poNumber}</TableCell>
      <TableCell>{po.supplier?.name || "-"}</TableCell>
      <TableCell>
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(po.status)}`}>
          {po.status}
        </span>
      </TableCell>
      <TableCell className="font-medium">
        {po.total.toLocaleString()} {po.currency}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {fmtDate(expected)}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {fmtDate(orderDate)}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <RowActions
          viewHref={`/procurement/purchase-orders/${po._id}`}
          editHref={`/procurement/purchase-orders/${po._id}/edit`}
          onDelete={() => handleDelete(po._id)}
        />
      </TableCell>
    </TableRow>
  );
}
