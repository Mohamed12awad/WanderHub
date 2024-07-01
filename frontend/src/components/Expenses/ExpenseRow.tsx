import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/authContext";
import React from "react";
import { Link } from "react-router-dom";
import { approveExpense } from "@/utils/api";
import { useQueryClient } from "react-query";
interface CustomerRowProps {
  id: string;
  name: string;
  state: string;
  price: number;
  totalSales: string;
  date: string;
  handleDelete: (id: string) => void;
}

const CustomerRow: React.FC<CustomerRowProps> = ({
  id,
  name,
  state,
  price,
  totalSales,
  date,
  handleDelete,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const handleApprove = async (id: string) => {
    await approveExpense(id, true);
    queryClient.invalidateQueries("expenses");
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="hidden md:table-cell capitalize">{price}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            state == "Approved"
              ? "bg-emerald-500 text-white"
              : "bg-gray-500 text-white"
          }
        >
          {state}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell capitalize">
        {totalSales}
      </TableCell>
      <TableCell className="hidden md:table-cell capitalize">{date}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <Link to={`/expenses/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            {["admin", "manager"].includes(user!.role) && (
              <DropdownMenuItem
                disabled={state === "Approved"}
                onClick={async () => await handleApprove(id)}
              >
                Approve
              </DropdownMenuItem>
            )}
            <Link to={`/expenses/${id}/edit`}>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </Link>
            {["admin", "super admin"].includes(user!.role) && (
              <DropdownMenuItem onClick={() => handleDelete(id)}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default CustomerRow;
