import React, { useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPayments, deleteInvoicePayment } from "@/utils/api";
import { GenericTable, FilterConfig } from "@/components/common/GenericTable";
import { useAuth } from "@/contexts/authContext";
import RecordPaymentDialog from "@/components/Finance/RecordPaymentDialog";
import PaymentRow, { PaymentRecord } from "@/components/Finance/PaymentRow";
import { InvoicePayment } from "@/types/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "cheque", "other"];
const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", bank_transfer: "Bank Transfer", card: "Card", cheque: "Cheque", other: "Other",
};
const PAYMENT_SORT_FIELDS: Record<string, string> = { Date: "date", Amount: "amount" };

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
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'invoices:delete');
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const invoiceMapRef = useRef<Map<string, string>>(new Map());

  const fetchPaymentsForTable = useCallback(async (params: TableParams) => {
    const { filters = {}, sort, dir, ...pageParams } = params;
    const serverSort = sort ? PAYMENT_SORT_FIELDS[sort] : undefined;
    const resp = await getPayments({
      ...pageParams,
      ...filters,
      ...(serverSort ? { sort: serverSort, dir } : {}),
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
        headers={["Date", "Customer", "Invoice", "Amount", "Method", "Reference", "Recorded By"]}
        sortableHeaders={["Date", "Amount"]}
        filterConfigs={PAYMENT_FILTER_CONFIGS}
        renderRow={(item, handleDelete) => (
          <PaymentRow
            key={item._id}
            item={item}
            handleDelete={handleDelete}
            handleEdit={setEditingPayment}
            canDelete={canDelete}
          />
        )}
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
