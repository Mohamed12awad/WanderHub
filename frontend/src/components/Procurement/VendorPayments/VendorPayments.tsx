import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getVendorPayments, deleteVendorBillPayment } from "@/utils/api";
import { GenericTable, FilterConfig } from "@/components/common/GenericTable";
import { useAuth } from "@/contexts/authContext";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "cheque", "other"];
const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", bank_transfer: "Bank Transfer", card: "Card", cheque: "Cheque", other: "Other",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  bank_transfer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  card: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cheque: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export interface VendorPaymentRecord {
  _id: string;
  bill: { _id: string; billNumber: string; title: string; supplier: { _id: string; name: string } };
  amount: number;
  currency: string;
  date: string;
  method: string;
  reference?: string;
  notes?: string;
  account?: { _id: string; name: string };
  createdBy?: { _id: string; name: string };
  createdAt: string;
}

const FILTER_CONFIGS: FilterConfig[] = [
  {
    label: "Method",
    field: "method",
    type: "select",
    options: PAYMENT_METHODS.map((m) => ({ label: METHOD_LABELS[m], value: m })),
  },
  {
    label: "Currency",
    field: "currency",
    type: "select",
    options: CURRENCIES.map((c) => ({ label: c, value: c })),
  },
  { label: "Amount",       field: "amount", type: "number-range" },
  { label: "Payment Date", field: "date",   type: "date-range"   },
];

type TableParams = {
  page: number; limit: number; q: string;
  filters?: Record<string, string>;
  sort?: string; dir?: "asc" | "desc";
};

function clientPaginate<T>(list: T[], page: number, limit: number) {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  return { data: list.slice((page - 1) * limit, page * limit), total, page, pages };
}

export const VendorPayments: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatCurrency, formatDate } = useLanguage();
  const navigate = useNavigate();
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'vendor-bills:delete');

  // Map payment._id → billId so the delete handler can pass both
  const billMapRef = useRef<Map<string, string>>(new Map());

  const fetchData = useCallback(async (params: TableParams): Promise<{ data: ReturnType<typeof clientPaginate<VendorPaymentRecord>> }> => {
    const f = params.filters ?? {};
    const resp = await getVendorPayments({
      page: 1, limit: 1000,
      ...(f.method    ? { method: f.method }       : {}),
      ...(f.currency  ? { currency: f.currency }   : {}),
      ...(f.date_from ? { date_from: f.date_from } : {}),
      ...(f.date_to   ? { date_to: f.date_to }     : {}),
      ...(f.amount_min ? { amount_min: Number(f.amount_min) } : {}),
      ...(f.amount_max ? { amount_max: Number(f.amount_max) } : {}),
    });

    let list: VendorPaymentRecord[] = resp.data?.data ?? [];

    billMapRef.current.clear();
    for (const p of list) billMapRef.current.set(p._id, p.bill?._id);

    if (params.q) {
      const s = params.q.toLowerCase();
      list = list.filter((p) =>
        p.bill?.billNumber?.toLowerCase().includes(s) ||
        p.bill?.supplier?.name?.toLowerCase().includes(s) ||
        p.bill?.title?.toLowerCase().includes(s) ||
        p.reference?.toLowerCase().includes(s),
      );
    }

    if (params.sort) {
      const key: "amount" | "date" = params.sort === "amount" ? "amount" : "date";
      list = [...list].sort((a, b) => {
        if (a[key] < b[key]) return params.dir === "asc" ? -1 : 1;
        if (a[key] > b[key]) return params.dir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return { data: clientPaginate(list, params.page, params.limit) };
  }, []);

  const handleDelete = useCallback(async (paymentId: string) => {
    const billId = billMapRef.current.get(paymentId);
    if (!billId) throw new Error("Bill not found for payment");
    await deleteVendorBillPayment(billId, paymentId);
    queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
  }, [queryClient]);

  return (
    <GenericTable<VendorPaymentRecord>
      queryKey="vendor-payments"
      fetchData={fetchData}
      deleteData={handleDelete}
      columns={[
        { id: "date", header: "Date", sortKey: "date", kind: "date", cell: (payment) => <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">{formatDate(payment.date)}</span> },
        {
          id: "supplier",
          header: "Supplier",
          kind: "text",
          cell: (payment) => <Link to={`/procurement/suppliers/${payment.bill?.supplier?._id}`} className="text-primary hover:underline text-sm" onClick={(event) => event.stopPropagation()}>{payment.bill?.supplier?.name ?? "—"}</Link>,
        },
        {
          id: "billNumber",
          header: "Bill #",
          kind: "text",
          cell: (payment) => <Link to={`/procurement/bills/${payment.bill?._id}`} className="font-mono text-xs text-primary hover:underline" onClick={(event) => event.stopPropagation()}>{payment.bill?.billNumber ?? "—"}</Link>,
        },
        { id: "amount", header: "Amount", sortKey: "amount", kind: "number", cell: (payment) => <span className="font-medium">{formatCurrency(payment.amount, payment.currency)}</span> },
        { id: "method", header: "Method", kind: "status", cell: (payment) => <Badge variant="outline" className={METHOD_COLORS[payment.method] ?? METHOD_COLORS.other}>{METHOD_LABELS[payment.method] ?? payment.method}</Badge> },
        { id: "reference", header: "Reference", kind: "text", cell: (payment) => <span className="text-sm text-muted-foreground">{payment.reference ?? "—"}</span> },
        { id: "recordedBy", header: "Recorded By", kind: "text", cell: (payment) => <span className="text-sm text-muted-foreground">{payment.createdBy?.name ?? "—"}</span> },
      ]}
      onRowClick={(payment) => navigate(`/procurement/bills/${payment.bill._id}`)}
      renderActions={(payment, confirmDelete) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /><span className="sr-only">Actions</span></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/procurement/bills/${payment.bill?._id}`)}>View Bill</DropdownMenuItem>
            {canDelete && (
              <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => confirmDelete(payment._id)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 me-2" />Delete</DropdownMenuItem></>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      filterConfigs={FILTER_CONFIGS}
      title="Vendor Payments"
      description="All payments made to suppliers"
      addLink="/procurement/bills"
      addLabel="View Bills"
      emptyMessage="No vendor payments recorded yet"
    />
  );
};
