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
import { toggleUserState } from "@/utils/api";
import { useQueryClient } from "react-query";

interface CustomerRowProps {
  id: string;
  name: string;
  state: string;
  price: string;
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
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleToggleState = async (id: string) => {
    await toggleUserState(id);
    queryClient.invalidateQueries("Users"); // Invalidate and refetch the 'Users' query
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          // className={state == "Deal Closed" && "bg-emeradld-300"}
        >
          {state}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell capitalize">{price}</TableCell>
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
            <Link to={`/users/${id}/edit`}>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </Link>

            <DropdownMenuItem
              disabled={user?.id == id ? true : false}
              onClick={() => handleToggleState(id)}
            >
              Toggle Active
            </DropdownMenuItem>

            {user?.role === "admin" && (
              <DropdownMenuItem
                disabled={user?.id == id ? true : false}
                onClick={() => handleDelete(id)}
              >
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
