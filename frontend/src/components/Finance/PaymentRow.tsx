import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PaymentRecord {
  _id: string;
  invoice: { _id: string; invoiceNumber: string; title: string; customer: { _id: string; name: string } };
  amount: number;
  currency: string;
  date: string;
  method: string;
  reference?: string;
  notes?: string;
  accountId?: string;
  account?: { _id: string; name: string };
  createdBy?: { _id: string; name: string };
  createdAt: string;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  bank_transfer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  card: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cheque: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const PaymentRow: React.FC<{
  item: PaymentRecord;
  handleDelete: (id: string) => void;
  handleEdit: (p: PaymentRecord) => void;
  canDelete: boolean;
}> = ({ item: p, handleDelete, handleEdit, canDelete }) => {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useLanguage();

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/40"
      onClick={() => navigate(`/finance/invoices/${p.invoice._id}`)}
    >
      <TableCell className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
        {formatDate(p.date)}
      </TableCell>
      <TableCell dir="auto">
        {p.invoice?.customer ? (
          <Link
            to={`/customers/${p.invoice.customer._id}`}
            className="text-primary hover:underline text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {p.invoice.customer.name}
          </Link>
        ) : "—"}
      </TableCell>
      <TableCell dir="auto">
        {p.invoice ? (
          <Link
            to={`/finance/invoices/${p.invoice._id}`}
            className="font-mono text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {p.invoice.invoiceNumber}
          </Link>
        ) : "—"}
      </TableCell>
      <TableCell dir="auto" className="text-right font-medium tabular-nums">
        {formatCurrency(p.amount, p.currency)}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={METHOD_COLORS[p.method] ?? METHOD_COLORS.other}>
          {METHOD_LABELS[p.method] ?? p.method}
        </Badge>
      </TableCell>
      <TableCell dir="auto" className="text-sm text-muted-foreground">
        {p.reference ?? "—"}
      </TableCell>
      <TableCell dir="auto" className="text-sm text-muted-foreground">
        {p.createdBy?.name ?? "—"}
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
            <DropdownMenuItem onClick={() => navigate(`/finance/invoices/${p.invoice._id}`)}>
              View Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(p)}>
              <Pencil className="h-3.5 w-3.5 me-2" />Edit
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(p._id)}
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

export default PaymentRow;
