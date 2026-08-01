import React from "react";
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
import { Link, useNavigate } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  lead:        "bg-sky-500     text-white border-sky-500     dark:bg-sky-600     dark:border-sky-600",
  qualified:   "bg-violet-500  text-white border-violet-500  dark:bg-violet-600  dark:border-violet-600",
  proposal:    "bg-amber-500   text-white border-amber-500   dark:bg-amber-600   dark:border-amber-600",
  negotiation: "bg-orange-500  text-white border-orange-500  dark:bg-orange-600  dark:border-orange-600",
  won:         "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  lost:        "bg-rose-500    text-white border-rose-500    dark:bg-rose-600    dark:border-rose-600",
  cancelled:   "bg-slate-400   text-white border-slate-400   dark:bg-slate-600   dark:border-slate-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-rose-100   text-rose-700   border-rose-300   dark:bg-rose-900/30   dark:text-rose-400   dark:border-rose-700",
  medium: "bg-amber-100  text-amber-700  border-amber-300  dark:bg-amber-900/30  dark:text-amber-400  dark:border-amber-700",
  low:    "bg-slate-100  text-slate-600  border-slate-300  dark:bg-slate-800     dark:text-slate-400  dark:border-slate-600",
};

interface DealRowProps {
  id: string;
  title: string;
  customer: string;
  status: string;
  priority?: string;
  owner?: string;
  value: string;
  date: string;
  handleDelete: (id: string) => void;
  selectionCell?: React.ReactNode;
}

const DealRow: React.FC<DealRowProps> = ({ id, title, customer, status, priority, owner, value, date, handleDelete, selectionCell }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/deals/${id}`)}>
      {selectionCell}
      <TableCell dir="auto" className="font-medium">{title}</TableCell>
      <TableCell dir="auto" className="text-foreground/70">{customer}</TableCell>
      <TableCell>
        <Badge className={`${STATUS_COLORS[status] ?? ""} capitalize w-fit`} variant="outline">
          {status}
        </Badge>
      </TableCell>
      <TableCell className="">
        {priority ? (
          <Badge className={`${PRIORITY_COLORS[priority] ?? ""} capitalize w-fit text-xs`} variant="outline">
            {priority}
          </Badge>
        ) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell dir="auto" className="hidden lg:table-cell text-foreground/70 text-sm">{owner ?? "—"}</TableCell>
      <TableCell dir="auto" className="font-medium tabular-nums">{value}</TableCell>
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
            <Link to={`/deals/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            <Link to={`/deals/${id}/edit`}>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </Link>
            {(user!.permissions?.some((p) => p === '*' || p === 'deals:delete')) && (
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

export default DealRow;
