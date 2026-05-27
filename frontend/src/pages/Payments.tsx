import React, { useRef, useState, useCallback } from "react";
import { useQueryClient } from "react-query";
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

// ── Client-side fetch wrapper ─────────────────────────────────────────────────

type TableParams = {
  page: number;
  limit: number;
  q: string;
  filters?: Record<string, string>;
  sort?: string;
  dir?: "asc" | "desc";
};

function paginate<T>(list: T[], page: number, limit: number) {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const data = list.slice((page - 1) * limit, page * limit);
  return { data, total, page, pages };
}

// ── Payments Page ─────────────────────────────────────────────────────────────

const Payments: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canDelete = ["admin", "super admin"].includes(user!.role);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const invoiceMapRef = useRef<Map<string, string>>(new Map());

  const fetchPaymentsForTable = useCallback(async (params: TableParams): Promise<{ data: ReturnType<typeof paginate<PaymentRecord>> }> => {
    const resp = await getPayments({ page: 1, limit: 1000 });
    let list: PaymentRecord[] = resp.data?.data ?? [];

    invoiceMapRef.current.clear();
    for (const p of list) invoiceMapRef.current.set(p._id, p.invoice._id);

    if (params.q) {
      const s = params.q.toLowerCase();
      list = list.filter(
        (p) =>
          p.invoice?.invoiceNumber?.toLowerCase().includes(s) ||
          p.invoice?.customer?.name?.toLowerCase().includes(s) ||
          p.invoice?.title?.toLowerCase().includes(s) ||
          p.reference?.toLowerCase().includes(s),
      );
    }

    const f = params.filters ?? {};
    if (f.method) list = list.filter((p) => p.method === f.method);
    if (f.currency) list = list.filter((p) => p.currency === f.currency);
    if (f.amount_min) list = list.filter((p) => p.amount >= Number(f.amount_min));
    if (f.amount_max) list = list.filter((p) => p.amount <= Number(f.amount_max));
    if (f.date_from) list = list.filter((p) => p.date >= f.date_from);
    if (f.date_to) list = list.filter((p) => p.date <= f.date_to + "T23:59:59");

    if (params.sort) {
      const key = { Date: "date", Amount: "amount" }[params.sort] as keyof PaymentRecord | undefined;
      if (key) {
        list = [...list].sort((a, b) => {
          const va = a[key] ?? "";
          const vb = b[key] ?? "";
          const d = params.dir ?? "desc";
          if (va < vb) return d === "asc" ? -1 : 1;
          if (va > vb) return d === "asc" ? 1 : -1;
          return 0;
        });
      }
    }

    return { data: paginate(list, params.page, params.limit) };
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
            queryClient.invalidateQueries("payments-gt");
          }}
        />
      )}
    </>
  );
};

export default Payments;
