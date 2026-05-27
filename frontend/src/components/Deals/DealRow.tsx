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

interface DealRowProps {
  id: string;
  title: string;
  customer: string;
  status: string;
  value: string;
  date: string;
  handleDelete: (id: string) => void;
}

const DealRow: React.FC<DealRowProps> = ({ id, title, customer, status, value, date, handleDelete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/deals/${id}`)}>
      <TableCell className="font-medium">{title}</TableCell>
      <TableCell className="text-foreground/70">{customer}</TableCell>
      <TableCell>
        <Badge className={`${STATUS_COLORS[status] ?? ""} capitalize w-fit`} variant="outline">
          {status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell font-medium tabular-nums">{value}</TableCell>
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
            <Link to={`/deals/${id}`}>
              <DropdownMenuItem>View</DropdownMenuItem>
            </Link>
            <Link to={`/deals/${id}/edit`}>
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

export default DealRow;
