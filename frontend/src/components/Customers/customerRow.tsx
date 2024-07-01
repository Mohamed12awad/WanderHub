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
// import { deleteCustomer } from "@/utils/api";

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
  const { user } = useAuth();

  return (
    <TableRow>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="hidden md:table-cell capitalize">
        <Badge
          variant="outline"
          // className={state == "Deal Closed" && "bg-emeradld-300"}
        >
          {state}
        </Badge>
      </TableCell>
      <TableCell className="capitalize">{price}</TableCell>
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
            <Link to={`/customers/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            <Link to={`/customers/${id}/edit`}>
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
