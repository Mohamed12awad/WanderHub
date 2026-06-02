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
import { Link, useNavigate } from "react-router-dom";
import { approveExpenseReport } from "@/utils/api";
import { useQueryClient } from "@tanstack/react-query";

interface ExpenseRowProps {
  id: string;
  title: string;
  total: number;
  approvalStatus: "pending" | "approved" | "rejected";
  owner: string;
  date: string;
  handleDelete: (id: string) => void;
}

const STATUS_CLASS: Record<string, string> = {
  approved: "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  rejected: "bg-red-500 text-white border-red-500 dark:bg-red-600 dark:border-red-600",
  pending:  "bg-amber-500 text-white border-amber-500 dark:bg-amber-600 dark:border-amber-600",
};

const ExpenseRow: React.FC<ExpenseRowProps> = ({ id, title, total, approvalStatus, owner, date, handleDelete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleApprove = async () => {
    await approveExpenseReport(id);
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/expenses/${id}`)}>
      <TableCell className="font-medium">{title}</TableCell>
      <TableCell className="font-medium tabular-nums">
        {total.toLocaleString()}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={STATUS_CLASS[approvalStatus] ?? STATUS_CLASS.pending}
        >
          {approvalStatus === "approved" ? "Approved" : approvalStatus === "rejected" ? "Rejected" : "Pending"}
        </Badge>
      </TableCell>
      <TableCell className="text-foreground/70">{owner}</TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">{date}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link to={`/expenses/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            <Link to={`/expenses/${id}/edit`}>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </Link>
            {["admin", "manager"].includes(user!.role) && (
              <DropdownMenuItem disabled={approvalStatus === "approved"} onClick={handleApprove}>
                Approve
              </DropdownMenuItem>
            )}
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

export default ExpenseRow;
