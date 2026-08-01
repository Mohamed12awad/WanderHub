import { GenericTable } from "@/components/common/GenericTable";
import { getVendorBills, deleteVendorBill } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { ProcurementStatusBadge } from "../statusBadge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface VendorBillRecord {
  _id: string;
  createdAt: string;
  billNumber: string;
  title: string;
  supplier?: { name: string } | string;
  status: string;
  total: number;
  totalPaid: number;
  currency: string;
}

export function VendorBills() {
  const { tr, formatCurrency } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const v = (tr as any).bills;
  const canDelete = (user?.permissions ?? []).some((permission) => permission === "*" || permission === "vendor-bills:delete");

  return (
    <GenericTable<VendorBillRecord>
      queryKey="vendor-bills"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getVendorBills({ page, limit, q, ...(sort ? { sort, dir } : {}), ...(filters ?? {}) })
      }
      deleteData={deleteVendorBill}
      columns={[
        { id: "billNumber", header: v?.headers?.[0] ?? "Bill Number", kind: "text", hideable: false, cell: (bill) => <span className="font-medium">{bill.billNumber}</span> },
        { id: "title", header: tr.finance.titleHeader, kind: "text", cell: (bill) => bill.title },
        { id: "supplier", header: v?.headers?.[1] ?? "Supplier", kind: "text", cell: (bill) => <span className="text-muted-foreground">{typeof bill.supplier === "object" ? bill.supplier?.name : bill.supplier ?? "—"}</span> },
        { id: "status", header: v?.headers?.[2] ?? "Status", kind: "status", cell: (bill) => <ProcurementStatusBadge status={bill.status} /> },
        { id: "total", header: v?.headers?.[3] ?? "Total", kind: "number", cell: (bill) => bill.total != null ? formatCurrency(bill.total, bill.currency) : "—" },
        {
          id: "outstanding",
          header: tr.finance.outstanding,
          kind: "number",
          cell: (bill) => {
            const outstanding = (bill.total ?? 0) - (bill.totalPaid ?? 0);
            return <span className={`font-medium ${outstanding > 0 ? "text-destructive" : "text-emerald-600"}`}>{formatCurrency(outstanding, bill.currency)}</span>;
          },
        },
      ]}
      onRowClick={(bill) => navigate(`/procurement/bills/${bill._id}`)}
      renderActions={(bill, handleDelete) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={tr.common.actions}><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link to={`/procurement/bills/${bill._id}`}><DropdownMenuItem>{tr.common.view ?? "View"}</DropdownMenuItem></Link>
            <Link to={`/procurement/bills/${bill._id}/edit`}><DropdownMenuItem>{tr.common.edit}</DropdownMenuItem></Link>
            {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(bill._id)}>{tr.common.delete}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      title={v?.title ?? "Vendor Bills"}
      description={v?.description ?? "Track bills and payables to your suppliers."}
      addLink="/procurement/bills/new"
      addLabel={v?.add ?? "Add Bill"}
      module="procurement"
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "received", label: "Received" },
          { value: "partially_paid", label: "Partially Paid" },
          { value: "paid", label: "Paid" },
          { value: "overdue", label: "Overdue" },
        ],
      }}
    />
  );
}
