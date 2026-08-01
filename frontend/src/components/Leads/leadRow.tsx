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

const RATING_DOT: Record<string, string> = {
  cold: "bg-sky-400",
  warm: "bg-amber-400",
  hot:  "bg-red-500",
};

interface LeadItem {
  _id: string;
  name: string;
  company?: string;
  status: string;
  rating?: string;
  phone?: string;
  source?: string;
  owner?: { _id: string; name: string } | null;
  createdAt: string;
}

interface LeadRowProps {
  item: LeadItem;
  handleDelete: (id: string) => void;
  selectionCell?: React.ReactNode;
}

const LeadRow: React.FC<LeadRowProps> = ({ item, handleDelete, selectionCell }) => {
  const { user } = useAuth();
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const statusLabel = tr.leads.statuses[item.status] ?? item.status;
  const date = new Date(item.createdAt).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/leads/${item._id}`)}>
      {selectionCell}
      <TableCell dir="auto">
        <div className="font-medium">{item.name}</div>
        {item.company && <div className="text-xs text-muted-foreground">{item.company}</div>}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`${STATUS_COLORS[item.status] ?? ""} capitalize w-fit`}>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell>
        {item.rating && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
            <span className={`h-2 w-2 rounded-full ${RATING_DOT[item.rating] ?? "bg-muted"}`} />
            {tr.leads.ratings?.[item.rating] ?? item.rating}
          </span>
        )}
      </TableCell>
      <TableCell dir="auto" className="text-foreground/70">{item.phone}</TableCell>
      <TableCell className="text-foreground/70 capitalize">{item.source}</TableCell>
      <TableCell dir="auto" className="text-foreground/70">{item.owner?.name}</TableCell>
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
            <Link to={`/leads/${item._id}`}>
              <DropdownMenuItem>{tr.common.view}</DropdownMenuItem>
            </Link>
            <Link to={`/leads/${item._id}/edit`}>
              <DropdownMenuItem>{tr.common.edit}</DropdownMenuItem>
            </Link>
            {(user!.permissions?.some((p) => p === '*' || p === 'leads:delete')) && (
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

export default LeadRow;
