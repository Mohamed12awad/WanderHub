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
  new:         "bg-sky-500     text-white border-sky-500",
  contacted:   "bg-violet-500  text-white border-violet-500",
  qualified:   "bg-emerald-500 text-white border-emerald-500",
  unqualified: "bg-slate-400   text-white border-slate-400",
  converted:   "bg-amber-500   text-white border-amber-500",
};

interface LeadRowProps {
  id: string;
  name: string;
  status: string;
  phone?: string;
  source?: string;
  owner?: { _id: string; name: string } | null;
  date: string;
  handleDelete: (id: string) => void;
}

const LeadRow: React.FC<LeadRowProps> = ({ id, name, status, phone, source, owner, date, handleDelete }) => {
  const { user } = useAuth();
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const statusLabel = tr.leads.statuses[status] ?? status;

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/leads/${id}`)}>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`${STATUS_COLORS[status] ?? ""} capitalize w-fit`}>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70">{phone}</TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70 capitalize">{source}</TableCell>
      <TableCell className="hidden md:table-cell text-foreground/70">{owner?.name}</TableCell>
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
            <Link to={`/leads/${id}`}>
              <DropdownMenuItem>{tr.common.actions}</DropdownMenuItem>
            </Link>
            <Link to={`/leads/${id}/edit`}>
              <DropdownMenuItem>{tr.common.edit}</DropdownMenuItem>
            </Link>
            {["admin", "super admin"].includes(user!.role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDelete(id)}
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

export default LeadRow;
