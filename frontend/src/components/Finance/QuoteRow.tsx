import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Edit, ArrowRightLeft, Trash2 } from "lucide-react";
import { FinanceStatusBadge } from "@/components/Finance/FinanceStatusBadge";
import { Quote } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";

const QuoteRow: React.FC<{
  item: Quote;
  handleDelete: (id: string) => void;
  handleConvert: (id: string) => void;
  canDelete: boolean;
}> = ({ item: q, handleDelete, handleConvert, canDelete }) => {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useLanguage();

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/40"
      onClick={() => navigate(`/finance/quotes/${q._id}`)}
    >
      <TableCell dir="auto" className="font-mono text-xs text-muted-foreground">{q.quoteNumber}</TableCell>
      <TableCell dir="auto" className="font-medium max-w-[180px] truncate">{q.title}</TableCell>
      <TableCell dir="auto">
        <Link
          to={`/customers/${q.customer._id}`}
          className="text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {q.customer.name}
        </Link>
      </TableCell>
      <TableCell>
        <FinanceStatusBadge status={q.status} type="quote" />
      </TableCell>
      <TableCell className="">
        {q.convertedToInvoice ? (
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            Converted
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground capitalize">{q.approvalStatus ?? "—"}</span>
        )}
      </TableCell>
      <TableCell dir="auto" className="text-right font-medium tabular-nums">
        {formatCurrency(q.total, q.currency)}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        {q.validUntil ? formatDate(q.validUntil) : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        {formatDate(q.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
            <DropdownMenuItem onClick={() => navigate(`/finance/quotes/${q._id}`)}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/finance/quotes/${q._id}/edit`)}>
              <Edit className="h-3.5 w-3.5 me-2" />Edit
            </DropdownMenuItem>
            {!q.convertedToInvoice && (
              <DropdownMenuItem onClick={() => handleConvert(q._id)}>
                <ArrowRightLeft className="h-3.5 w-3.5 me-2" />Convert to Invoice
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(q._id)}
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

export default QuoteRow;
