import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Trash2 } from "lucide-react";

export interface VendorPaymentRecord {
  _id: string;
  bill: {
    _id: string;
    billNumber: string;
    title: string;
    supplier: { _id: string; name: string };
  };
  amount: number;
  currency: string;
  date: string;
  method: string;
  reference?: string;
  notes?: string;
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
  cash:          "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
  bank_transfer: "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
  card:          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cheque:        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  other:         "bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400",
};

const VendorPaymentRow: React.FC<{
  item: VendorPaymentRecord;
  handleDelete: (id: string) => void;
  canDelete: boolean;
}> = ({ item: p, handleDelete, canDelete }) => {
  const navigate = useNavigate();

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/40"
      onClick={() => navigate(`/procurement/bills/${p.bill._id}`)}
    >
      <TableCell className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
        {new Date(p.date).toLocaleDateString()}
      </TableCell>
      <TableCell dir="auto">
        <Link
          to={`/procurement/suppliers/${p.bill?.supplier?._id}`}
          className="text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {p.bill?.supplier?.name ?? "—"}
        </Link>
      </TableCell>
      <TableCell dir="auto">
        <Link
          to={`/procurement/bills/${p.bill?._id}`}
          className="font-mono text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {p.bill?.billNumber ?? "—"}
        </Link>
      </TableCell>
      <TableCell dir="auto" className="text-right font-medium tabular-nums">
        {p.amount.toLocaleString()}{" "}
        <span className="text-xs text-muted-foreground">{p.currency}</span>
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
            <DropdownMenuItem onClick={() => navigate(`/procurement/bills/${p.bill?._id}`)}>
              View Bill
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

export default VendorPaymentRow;
