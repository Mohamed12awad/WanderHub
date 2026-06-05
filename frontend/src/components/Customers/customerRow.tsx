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
import { useLanguage } from "@/contexts/LanguageContext";
import React from "react";
import { Link, useNavigate } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  inactive: "bg-slate-400   text-white border-slate-400   dark:bg-slate-600   dark:border-slate-600",
  lead:     "bg-sky-500     text-white border-sky-500     dark:bg-sky-600     dark:border-sky-600",
  prospect: "bg-violet-500  text-white border-violet-500  dark:bg-violet-600  dark:border-violet-600",
};

interface CustomerItem {
  _id: string;
  name: string;
  status: string;
  phone: string;
  location: string;
  createdAt: string;
}

interface CustomerRowProps {
  item: CustomerItem;
  handleDelete: (id: string) => void;
  selectionCell?: React.ReactNode;
}

const CustomerRow: React.FC<CustomerRowProps> = ({ item, handleDelete, selectionCell }) => {
  const { user } = useAuth();
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const date = new Date(item.createdAt).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/customers/${item._id}`)}>
      {selectionCell}
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`${STATUS_COLORS[item.status] ?? ""} capitalize w-fit`}>
          {tr.contacts.statuses?.[item.status] ?? item.status}
        </Badge>
      </TableCell>
      <TableCell className="text-foreground/70">{item.phone}</TableCell>
      <TableCell className="text-foreground/70 capitalize">{item.location}</TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">{date}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{tr.common.actions}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link to={`/customers/${item._id}`}>
              <DropdownMenuItem>{tr.common.view}</DropdownMenuItem>
            </Link>
            <Link to={`/customers/${item._id}/edit`}>
              <DropdownMenuItem>{tr.common.edit}</DropdownMenuItem>
            </Link>
            {["admin", "super admin"].includes(user!.role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDelete(item._id)}
                >
                  {tr.common.delete}
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
