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

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  inactive: "bg-slate-400   text-white border-slate-400   dark:bg-slate-600   dark:border-slate-600",
  lead:     "bg-sky-500     text-white border-sky-500     dark:bg-sky-600     dark:border-sky-600",
  prospect: "bg-violet-500  text-white border-violet-500  dark:bg-violet-600  dark:border-violet-600",
};

interface CustomerRowProps {
  id: string;
  name: string;
  status: string;
  phone: string;
  location: string;
  date: string;
  handleDelete: (id: string) => void;
}

const CustomerRow: React.FC<CustomerRowProps> = ({ id, name, status, phone, location, date, handleDelete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/customers/${id}`)}>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`${STATUS_COLORS[status] ?? ""} capitalize w-fit`}>
          {status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70">{phone}</TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70 capitalize">{location}</TableCell>
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
            <Link to={`/customers/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            <Link to={`/customers/${id}/edit`}>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </Link>
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

export default CustomerRow;
