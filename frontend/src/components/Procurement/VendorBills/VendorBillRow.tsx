import { TableRow, TableCell } from "@/components/ui/table";
import { useNavigate, Link } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { ProcurementStatusBadge } from "../statusBadge";

interface Props {
  _id: string;
  billNumber: string;
  title: string;
  supplier?: { name: string } | string;
  status: string;
  total: number;
  totalPaid: number;
  currency: string;
  handleDelete: (id: string) => void;
}

const VendorBillRow: React.FC<Props> = ({ _id, billNumber, title, supplier, status, total, totalPaid, currency, handleDelete }) => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const { user } = useAuth();
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'vendor-bills:delete');
  const supplierName = typeof supplier === "object" ? supplier?.name : supplier;
  const outstanding = (total ?? 0) - (totalPaid ?? 0);

  return (
    <TableRow className="group cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/procurement/bills/${_id}`)}>
      <TableCell dir="auto" className="font-medium">{billNumber}</TableCell>
      <TableCell dir="auto">{title}</TableCell>
      <TableCell dir="auto" className="text-muted-foreground">{supplierName ?? "—"}</TableCell>
      <TableCell><ProcurementStatusBadge status={status} /></TableCell>
      <TableCell dir="auto" className="tabular-nums">{total?.toLocaleString()} {currency}</TableCell>
      <TableCell dir="auto" className={`tabular-nums font-medium ${outstanding > 0 ? "text-destructive" : "text-emerald-600"}`}>{outstanding.toLocaleString()} {currency}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={tr.common.actions} className="opacity-0 group-hover:opacity-100 transition"><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link to={`/procurement/bills/${_id}`}><DropdownMenuItem>{tr.common.view ?? "View"}</DropdownMenuItem></Link>
            <Link to={`/procurement/bills/${_id}/edit`}><DropdownMenuItem>{tr.common.edit}</DropdownMenuItem></Link>
            {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(_id)}>{tr.common.delete}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default VendorBillRow;
