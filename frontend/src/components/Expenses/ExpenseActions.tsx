import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/authContext";
import { Link } from "react-router-dom";
import { approveExpenseReport } from "@/utils/api";
import { useQueryClient } from "@tanstack/react-query";
import type { ExpenseReportData } from "./Expenses";

interface ExpenseActionsProps {
  item: ExpenseReportData;
  handleDelete: (id: string) => void;
}

export default function ExpenseActions({ item, handleDelete }: ExpenseActionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleApprove = async () => {
    await approveExpenseReport(item._id);
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Link to={`/expenses/${item._id}`}><DropdownMenuItem>View</DropdownMenuItem></Link>
        <Link to={`/expenses/${item._id}/edit`}><DropdownMenuItem>Edit</DropdownMenuItem></Link>
        {user?.permissions?.some((permission) => permission === "*" || permission === "expenses:approve") && (
          <DropdownMenuItem disabled={item.approvalStatus === "approved"} onClick={handleApprove}>Approve</DropdownMenuItem>
        )}
        {user?.permissions?.some((permission) => permission === "*" || permission === "expenses:delete") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(item._id)}>Delete</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
