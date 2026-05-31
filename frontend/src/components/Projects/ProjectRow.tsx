import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-400 text-white border-slate-400",
  active: "bg-blue-500 text-white border-blue-500",
  on_hold: "bg-amber-500 text-white border-amber-500",
  completed: "bg-emerald-500 text-white border-emerald-500",
  cancelled: "bg-red-500 text-white border-red-500",
};

interface Props {
  _id: string;
  name: string;
  customer?: { name: string } | null;
  manager?: { name: string } | null;
  status: string;
  budget?: number;
  currency: string;
  endDate?: string;
  handleDelete: (id: string) => void;
}

const ProjectRow: React.FC<Props> = ({ _id, name, customer, manager, status, budget, currency, endDate, handleDelete }) => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const { user } = useAuth();
  const canDelete = ["admin", "super admin"].includes(user?.role ?? "");

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/projects/${_id}`)}>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="text-muted-foreground">{customer?.name ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">{manager?.name ?? "—"}</TableCell>
      <TableCell><Badge variant="outline" className={`${STATUS_COLORS[status] ?? ""} capitalize`}>{status?.replace("_", " ")}</Badge></TableCell>
      <TableCell className="tabular-nums">{budget ? `${budget.toLocaleString()} ${currency}` : "—"}</TableCell>
      <TableCell className="text-muted-foreground text-xs">{endDate ? new Date(endDate).toLocaleDateString() : "—"}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition"><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link to={`/projects/${_id}`}><DropdownMenuItem>{tr.common.view ?? "View"}</DropdownMenuItem></Link>
            <Link to={`/projects/${_id}/edit`}><DropdownMenuItem>{tr.common.edit}</DropdownMenuItem></Link>
            {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(_id)}>{tr.common.delete}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default ProjectRow;
