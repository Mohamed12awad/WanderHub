import { useNavigate } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import { PurchaseOrder } from "@/types/types";
import { format } from "date-fns";

interface Props {
  po: PurchaseOrder;
  handleDelete: (id: string) => void;
}

export default function PurchaseOrderRow({ po, handleDelete }: Props) {
  const navigate = useNavigate();

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
    <TableRow className="group">
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
        {po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), "MMM d, yyyy") : "-"}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {format(new Date(po.issueDate), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/procurement/purchase-orders/${po._id}`)}
          >
            <Eye className="w-4 h-4 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/procurement/purchase-orders/${po._id}/edit`)}
          >
            <Edit className="w-4 h-4 text-amber-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(po._id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
