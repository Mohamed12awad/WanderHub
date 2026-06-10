import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getVendorPayments, deleteVendorBillPayment } from "@/utils/api";
import { GenericTable, FilterConfig } from "@/components/common/GenericTable";
import { useAuth } from "@/contexts/authContext";
import VendorPaymentRow, { VendorPaymentRecord } from "./VendorPaymentRow";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "cheque", "other"];
const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", bank_transfer: "Bank Transfer", card: "Card", cheque: "Cheque", other: "Other",
};

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
      const key = params.sort === "Amount" ? "amount" : "date";
      list = [...list].sort((a: any, b: any) => {
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
      headers={["Date", "Supplier", "Bill #", "Amount", "Method", "Reference", "Recorded By"]}
      sortableHeaders={["Date", "Amount"]}
      filterConfigs={FILTER_CONFIGS}
      renderRow={(item) => (
        <VendorPaymentRow
          key={item._id}
          item={item}
          handleDelete={handleDelete}
          canDelete={canDelete}
        />
      )}
      title="Vendor Payments"
      description="All payments made to suppliers"
      addLink="/procurement/bills"
      addLabel="View Bills"
      emptyMessage="No vendor payments recorded yet"
    />
  );
};
