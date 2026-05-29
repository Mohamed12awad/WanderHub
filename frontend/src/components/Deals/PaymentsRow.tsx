import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/authContext";
import React from "react";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  pending:   "bg-amber-500  text-white border-amber-500  dark:bg-amber-600  dark:border-amber-600",
  failed:    "bg-rose-500   text-white border-rose-500   dark:bg-rose-600   dark:border-rose-600",
  refunded:  "bg-slate-400  text-white border-slate-400  dark:bg-slate-600  dark:border-slate-600",
};

interface PaymentRowProps {
  id: string;
  reference?: string;
  amount: string;
  date: string;
  method: string;
  status: string;
  handleDelete: (id: string) => void;
}

const PaymentRow: React.FC<PaymentRowProps> = ({ id, reference, amount, date, method, status, handleDelete }) => {
  const { user } = useAuth();

  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-muted-foreground">{reference ?? "—"}</TableCell>
      <TableCell className="font-medium tabular-nums">{amount}</TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">{date}</TableCell>
      <TableCell className="text-foreground/70 capitalize">{method}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`${STATUS_COLORS[status] ?? ""} capitalize w-fit`}>
          {status}
        </Badge>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["admin", "super admin"].includes(user!.role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(id)}>
                  Delete
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
