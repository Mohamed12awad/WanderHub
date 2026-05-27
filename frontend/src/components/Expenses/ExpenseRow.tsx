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
import { approveExpense } from "@/utils/api";
import { useQueryClient } from "react-query";

interface ExpenseRowProps {
  id: string;
  title: string;
  total: number;
  approved: boolean;
  owner: string;
  date: string;
  handleDelete: (id: string) => void;
}

const ExpenseRow: React.FC<ExpenseRowProps> = ({ id, title, total, approved, owner, date, handleDelete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleApprove = async () => {
    await approveExpense(id, true);
    queryClient.invalidateQueries("expenses");
  };

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/expenses/${id}`)}>
      <TableCell className="font-medium">{title}</TableCell>
      <TableCell className="hidden md:table-cell font-medium tabular-nums">
        {total.toLocaleString()}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={approved
            ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
            : "bg-amber-500  text-white border-amber-500  dark:bg-amber-600  dark:border-amber-600"
          }
        >
          {approved ? "Approved" : "Pending"}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70">{owner}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-xs tabular-nums">{date}</TableCell>
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
              <DropdownMenuItem disabled={approved} onClick={handleApprove}>
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
