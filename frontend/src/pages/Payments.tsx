import React, { useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPayments, deleteInvoicePayment } from "@/utils/api";
import { GenericTable, FilterConfig } from "@/components/common/GenericTable";
import { useAuth } from "@/contexts/authContext";
import RecordPaymentDialog from "@/components/Finance/RecordPaymentDialog";
import { InvoicePayment } from "@/types/types";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"];
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

export interface PaymentRecord {
  _id: string;
  invoice: { _id: string; invoiceNumber: string; title: string; customer: { _id: string; name: string } };
  amount: number;
  currency: string;
  date: string;
  method: string;
  reference?: string;
  notes?: string;
  accountId?: string;
  account?: { _id: string; name: string };
  createdBy?: { _id: string; name: string };
  createdAt: string;
}

const PAYMENT_FILTER_CONFIGS: FilterConfig[] = [
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
  {
    label: "Amount",
    field: "amount",
    type: "number-range",
  },
  {
    label: "Date",
    field: "date",
    type: "date-range",
  },
];

// ── Server-side table query ───────────────────────────────────────────────────

type TableParams = {
  page: number;
  limit: number;
  q: string;
  filters?: Record<string, string>;
  sort?: string;
  dir?: "asc" | "desc";
};

// ── Payments Page ─────────────────────────────────────────────────────────────

const Payments: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatCurrency, formatDate } = useLanguage();
  const navigate = useNavigate();
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'invoices:delete');
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const invoiceMapRef = useRef<Map<string, string>>(new Map());

  const fetchPaymentsForTable = useCallback(async (params: TableParams) => {
    const { filters = {}, ...pageParams } = params;
    const resp = await getPayments({
      ...pageParams,
      ...filters,
    });
    const list: PaymentRecord[] = resp.data?.data ?? [];
    invoiceMapRef.current.clear();
    for (const p of list) invoiceMapRef.current.set(p._id, p.invoice._id);
    return resp;
  }, []);

  const deletePayment = useCallback(async (paymentId: string) => {
    const invoiceId = invoiceMapRef.current.get(paymentId);
    if (!invoiceId) throw new Error("Invoice not found for payment");
    await deleteInvoicePayment(invoiceId, paymentId);
  }, []);

  const toInvoicePayment = (p: PaymentRecord): InvoicePayment => ({
    _id: p._id,
    invoice: p.invoice._id,
    amount: p.amount,
    currency: p.currency,
    date: p.date,
    method: p.method as InvoicePayment["method"],
    reference: p.reference,
    notes: p.notes,
    accountId: p.accountId,
    account: p.account,
    createdBy: p.createdBy ?? { _id: "", name: "" },
    createdAt: p.createdAt,
  });

  return (
    <>
      <GenericTable<PaymentRecord>
        queryKey="payments-gt"
        fetchData={fetchPaymentsForTable}
        deleteData={deletePayment}
        columns={[
          { id: "date", header: "Date", sortKey: "date", kind: "date", cell: (payment) => <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">{formatDate(payment.date)}</span> },
          {
            id: "customer",
            header: "Customer",
            kind: "text",
            cell: (payment) => payment.invoice?.customer ? <Link to={`/customers/${payment.invoice.customer._id}`} className="text-primary hover:underline text-sm" onClick={(event) => event.stopPropagation()}>{payment.invoice.customer.name}</Link> : "—",
          },
          {
            id: "invoice",
            header: "Invoice",
            kind: "text",
            cell: (payment) => payment.invoice ? <Link to={`/finance/invoices/${payment.invoice._id}`} className="font-mono text-xs text-primary hover:underline" onClick={(event) => event.stopPropagation()}>{payment.invoice.invoiceNumber}</Link> : "—",
          },
          { id: "amount", header: "Amount", sortKey: "amount", kind: "number", cell: (payment) => <span className="font-medium">{formatCurrency(payment.amount, payment.currency)}</span> },
          { id: "method", header: "Method", kind: "status", cell: (payment) => <Badge variant="outline" className={METHOD_COLORS[payment.method] ?? METHOD_COLORS.other}>{METHOD_LABELS[payment.method] ?? payment.method}</Badge> },
          { id: "reference", header: "Reference", kind: "text", cell: (payment) => <span className="text-sm text-muted-foreground">{payment.reference ?? "—"}</span> },
          { id: "recordedBy", header: "Recorded By", kind: "text", cell: (payment) => <span className="text-sm text-muted-foreground">{payment.createdBy?.name ?? "—"}</span> },
        ]}
        onRowClick={(payment) => navigate(`/finance/invoices/${payment.invoice._id}`)}
        renderActions={(payment, handleDelete) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /><span className="sr-only">Actions</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/finance/invoices/${payment.invoice._id}`)}>View Invoice</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingPayment(payment)}><Pencil className="h-3.5 w-3.5 me-2" />Edit</DropdownMenuItem>
              {canDelete && (
                <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(payment._id)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 me-2" />Delete</DropdownMenuItem></>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        filterConfigs={PAYMENT_FILTER_CONFIGS}
        title="Payments"
        description="All recorded invoice payments"
        addLink="/finance/invoices"
        addLabel="View Invoices"
        emptyMessage="No payments recorded yet"
      />

      {editingPayment && (
        <RecordPaymentDialog
          mode="edit"
          invoiceId={editingPayment.invoice._id}
          currency={editingPayment.currency}
          payment={toInvoicePayment(editingPayment)}
          open={!!editingPayment}
          onOpenChange={(o) => { if (!o) setEditingPayment(null); }}
          onSuccess={() => {
            setEditingPayment(null);
            queryClient.invalidateQueries({ queryKey: ["payments-gt"] });
          }}
        />
      )}
    </>
  );
};

export default Payments;
