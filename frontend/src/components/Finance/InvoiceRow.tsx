import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { FinanceStatusBadge } from "@/components/Finance/FinanceStatusBadge";
import { Invoice } from "@/types/types";

const InvoiceRow: React.FC<{
  item: Invoice;
  handleDelete: (id: string) => void;
  canDelete: boolean;
}> = ({ item: inv, handleDelete, canDelete }) => {
  const navigate = useNavigate();
  const outstanding = inv.total - inv.totalPaid;
  const isOverdue = inv.status === "overdue";

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/40"
      onClick={() => navigate(`/finance/invoices/${inv._id}`)}
    >
      <TableCell className="font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</TableCell>
      <TableCell className="font-medium max-w-[180px] truncate">{inv.title}</TableCell>
      <TableCell>
        <Link
          to={`/customers/${inv.customer._id}`}
          className="text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {inv.customer.name}
        </Link>
      </TableCell>
      <TableCell>
        <FinanceStatusBadge status={inv.status} type="invoice" />
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {inv.total.toLocaleString()}{" "}
        <span className="text-xs text-muted-foreground">{inv.currency}</span>
      </TableCell>
      <TableCell className={`text-right font-medium tabular-nums ${outstanding > 0 ? isOverdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
        {outstanding.toLocaleString()}{" "}
        <span className="text-xs opacity-70">{inv.currency}</span>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/finance/invoices/${inv._id}`)}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/finance/invoices/${inv._id}/edit`)}>
              <Edit className="h-3.5 w-3.5 me-2" />Edit
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(inv._id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 me-2" />Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default InvoiceRow;
