import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ReceiptText, CircleDollarSign, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getQuotes, getInvoices, deleteQuote, deleteInvoice, convertQuoteToInvoice,
} from "@/utils/api";
import { GenericTable, FilterConfig } from "@/components/common/GenericTable";
import { useAuth } from "@/contexts/authContext";
import { Quote, Invoice, QuoteStatus, InvoiceStatus } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import QuoteRow from "@/components/Finance/QuoteRow";
import InvoiceRow from "@/components/Finance/InvoiceRow";

// ── Constants ──────────────────────────────────────────────────────────────────

const QUOTE_STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "rejected", "expired"];
const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];
const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"];

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Filter configs ─────────────────────────────────────────────────────────────

const QUOTE_FILTER_CONFIGS: FilterConfig[] = [
  {
    label: "Currency",
    field: "currency",
    type: "select",
    options: CURRENCIES.map((c) => ({ label: c, value: c })),
  },
  {
    label: "Approval Status",
    field: "approvalStatus",
    type: "select",
    options: ["pending", "approved", "rejected"].map((s) => ({ label: statusLabel(s), value: s })),
  },
  {
    label: "Amount",
    field: "total",
    type: "number-range",
  },
  {
    label: "Valid Until",
    field: "validUntil",
    type: "date-range",
  },
  {
    label: "Created",
    field: "createdAt",
    type: "date-range",
  },
];

const INVOICE_FILTER_CONFIGS: FilterConfig[] = [
  {
    label: "Currency",
    field: "currency",
    type: "select",
    options: CURRENCIES.map((c) => ({ label: c, value: c })),
  },
  {
    label: "Approval Status",
    field: "approvalStatus",
    type: "select",
    options: ["pending", "approved", "rejected"].map((s) => ({ label: statusLabel(s), value: s })),
  },
  {
    label: "Amount",
    field: "total",
    type: "number-range",
  },
  {
    label: "Issue Date",
    field: "issueDate",
    type: "date-range",
  },
  {
    label: "Due Date",
    field: "dueDate",
    type: "date-range",
  },
  {
    label: "Created",
    field: "createdAt",
    type: "date-range",
  },
];

// ── Client-side fetch wrappers ────────────────────────────────────────────────

type TableParams = {
  page: number;
  limit: number;
  q: string;
  filters?: Record<string, string>;
  sort?: string;
  dir?: "asc" | "desc";
};

function applySort<T extends Record<string, unknown>>(
  list: T[],
  sortMap: Record<string, string>,
  sort: string | undefined,
  dir: "asc" | "desc" | undefined,
  computedFields?: Record<string, (item: T) => number | string>,
): T[] {
  const key = sort ? sortMap[sort] : "createdAt";
  if (!key) return list;

  return [...list].sort((a, b) => {
    const va = computedFields?.[key] ? computedFields[key](a) : (a[key] ?? "");
    const vb = computedFields?.[key] ? computedFields[key](b) : (b[key] ?? "");
    const d = dir ?? "desc";
    if (va < vb) return d === "asc" ? -1 : 1;
    if (va > vb) return d === "asc" ? 1 : -1;
    return 0;
  });
}

function paginate<T>(list: T[], page: number, limit: number) {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const data = list.slice((page - 1) * limit, page * limit);
  return { data, total, page, pages };
}

async function fetchQuotesForTable(params: TableParams): Promise<{ data: ReturnType<typeof paginate<Quote>> }> {
  const resp = await getQuotes();
  let list: Quote[] = Array.isArray(resp.data) ? resp.data : [];

  if (params.q) {
    const s = params.q.toLowerCase();
    list = list.filter(
      (q) =>
        q.title?.toLowerCase().includes(s) ||
        q.quoteNumber?.toLowerCase().includes(s) ||
        q.customer?.name?.toLowerCase().includes(s) ||
        q.deal?.title?.toLowerCase().includes(s),
    );
  }

  const f = params.filters ?? {};
  if (f.status) list = list.filter((q) => q.status === f.status);
  if (f.currency) list = list.filter((q) => q.currency === f.currency);
  if (f.approvalStatus) list = list.filter((q) => (q.approvalStatus ?? "pending") === f.approvalStatus);
  if (f.total_min) list = list.filter((q) => q.total >= Number(f.total_min));
  if (f.total_max) list = list.filter((q) => q.total <= Number(f.total_max));
  if (f.validUntil_from) list = list.filter((q) => q.validUntil && q.validUntil >= f.validUntil_from);
  if (f.validUntil_to) list = list.filter((q) => q.validUntil && q.validUntil <= f.validUntil_to + "T23:59:59");
  if (f.createdAt_from) list = list.filter((q) => q.createdAt >= f.createdAt_from);
  if (f.createdAt_to) list = list.filter((q) => q.createdAt <= f.createdAt_to + "T23:59:59");

  list = applySort(
    list as unknown as Record<string, unknown>[],
    { "Quote #": "quoteNumber", "Amount": "total", "Valid Until": "validUntil", "Created": "createdAt" },
    params.sort,
    params.dir ?? "desc",
  ) as unknown as Quote[];

  return { data: paginate(list, params.page, params.limit) };
}

async function fetchInvoicesForTable(params: TableParams): Promise<{ data: ReturnType<typeof paginate<Invoice>> }> {
  const resp = await getInvoices();
  let list: Invoice[] = Array.isArray(resp.data) ? resp.data : [];

  if (params.q) {
    const s = params.q.toLowerCase();
    list = list.filter(
      (i) =>
        i.title?.toLowerCase().includes(s) ||
        i.invoiceNumber?.toLowerCase().includes(s) ||
        i.customer?.name?.toLowerCase().includes(s) ||
        i.deal?.title?.toLowerCase().includes(s),
    );
  }

  const f = params.filters ?? {};
  if (f.status) list = list.filter((i) => i.status === f.status);
  if (f.currency) list = list.filter((i) => i.currency === f.currency);
  if (f.approvalStatus) list = list.filter((i) => (i.approvalStatus ?? "pending") === f.approvalStatus);
  if (f.total_min) list = list.filter((i) => i.total >= Number(f.total_min));
  if (f.total_max) list = list.filter((i) => i.total <= Number(f.total_max));
  if (f.issueDate_from) list = list.filter((i) => i.issueDate >= f.issueDate_from);
  if (f.issueDate_to) list = list.filter((i) => i.issueDate <= f.issueDate_to + "T23:59:59");
  if (f.dueDate_from) list = list.filter((i) => i.dueDate && i.dueDate >= f.dueDate_from);
  if (f.dueDate_to) list = list.filter((i) => i.dueDate && i.dueDate <= f.dueDate_to + "T23:59:59");
  if (f.createdAt_from) list = list.filter((i) => i.createdAt >= f.createdAt_from);
  if (f.createdAt_to) list = list.filter((i) => i.createdAt <= f.createdAt_to + "T23:59:59");

  list = applySort(
    list as unknown as Record<string, unknown>[],
    { "Invoice #": "invoiceNumber", "Total": "total", "Due Date": "dueDate" },
    params.sort,
    params.dir ?? "desc",
    { "Outstanding": (i) => (i as unknown as Invoice).total - (i as unknown as Invoice).totalPaid },
  ) as unknown as Invoice[];

  return { data: paginate(list, params.page, params.limit) };
}

// ── Invoice summary bar ───────────────────────────────────────────────────────

function groupByCurrency(invoices: Invoice[], getValue: (inv: Invoice) => number): [string, number][] {
  const map: Record<string, number> = {};
  for (const inv of invoices) {
    const cur = inv.currency || "—";
    map[cur] = (map[cur] ?? 0) + getValue(inv);
  }
  return Object.entries(map).filter(([, v]) => v > 0);
}

function CurrencyAmounts({ entries, className }: { entries: [string, number][]; className?: string }) {
  if (entries.length === 0) return <span className={`font-semibold tabular-nums ${className ?? ""}`}>0</span>;
  return (
    <>
      {entries.map(([cur, val], idx) => (
        <span key={cur} className="tabular-nums">
          {idx > 0 && <span className="text-border mx-1">·</span>}
          <span className={`font-semibold ${className ?? ""}`}>{val.toLocaleString()}</span>
          {" "}<span className="text-[11px] font-normal text-muted-foreground">{cur}</span>
        </span>
      ))}
    </>
  );
}

function InvoiceSummaryBar({ invoices }: { invoices: Invoice[] }) {
  const invoicedByCur = groupByCurrency(invoices, (i) => i.total);
  const collectedByCur = groupByCurrency(invoices, (i) => i.totalPaid);
  const outstandingByCur = groupByCurrency(
    invoices.filter((i) => ["overdue", "sent", "partially_paid"].includes(i.status)),
    (i) => i.total - i.totalPaid,
  );
  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const hasOutstanding = outstandingByCur.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <ReceiptText className="h-3.5 w-3.5 text-purple-500 shrink-0" />
        <span className="text-muted-foreground text-xs">Invoiced</span>
        <CurrencyAmounts entries={invoicedByCur} />
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <CircleDollarSign className="h-3.5 w-3.5 text-green-500 shrink-0" />
        <span className="text-muted-foreground text-xs">Collected</span>
        <CurrencyAmounts entries={collectedByCur} className="text-green-600 dark:text-green-400" />
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
        <span className="text-muted-foreground text-xs">Outstanding</span>
        <CurrencyAmounts
          entries={outstandingByCur}
          className={hasOutstanding ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
        />
        {!hasOutstanding && <span className="font-semibold text-green-600 dark:text-green-400 tabular-nums">0</span>}
        {overdue > 0 && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            {overdue} overdue
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Quotes Page ───────────────────────────────────────────────────────────────

export function QuotesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const canDelete = ["admin", "super admin"].includes(user!.role);

  const handleConvert = useCallback(async (id: string) => {
    try {
      const res = await convertQuoteToInvoice(id);
      queryClient.invalidateQueries({ queryKey: ["quotes-gt"] });
      toast({ title: "Converted to invoice." });
      navigate(`/finance/invoices/${res.data._id}`);
    } catch {
      toast({ title: "Conversion failed", variant: "destructive" });
    }
  }, [navigate, queryClient, toast]);

  return (
    <GenericTable<Quote>
      queryKey="quotes-gt"
      fetchData={fetchQuotesForTable}
      deleteData={deleteQuote}
      headers={["Quote #", "Title", "Customer", "Status", "Approval", "Amount", "Valid Until", "Created"]}
      sortableHeaders={["Quote #", "Amount", "Valid Until", "Created"]}
      quickStatusFilter={{
        field: "status",
        options: QUOTE_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
      }}
      filterConfigs={QUOTE_FILTER_CONFIGS}
      renderRow={(item, handleDelete) => (
        <QuoteRow
          key={item._id}
          item={item}
          handleDelete={handleDelete}
          handleConvert={handleConvert}
          canDelete={canDelete}
        />
      )}
      title="Quotes"
      description="Manage your quotes and proposals"
      addLink="/finance/quotes/new"
      addLabel="New Quote"
      emptyMessage="No quotes yet"
    />
  );
}

// ── Invoices Page ─────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const { user } = useAuth();
  const canDelete = ["admin", "super admin"].includes(user!.role);

  const { data: allData } = useQuery({
    queryKey: ["invoices-all"],
    queryFn: () => getInvoices(),
    staleTime: 30_000
  });
  const allInvoices: Invoice[] = allData?.data ?? [];

  return (
    <GenericTable<Invoice>
      queryKey="invoices-gt"
      fetchData={fetchInvoicesForTable}
      deleteData={deleteInvoice}
      headers={["Invoice #", "Title", "Customer", "Status", "Total", "Outstanding", "Due Date"]}
      sortableHeaders={["Invoice #", "Total", "Outstanding", "Due Date"]}
      quickStatusFilter={{
        field: "status",
        options: INVOICE_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
      }}
      filterConfigs={INVOICE_FILTER_CONFIGS}
      topContent={allInvoices.length > 0 ? <InvoiceSummaryBar invoices={allInvoices} /> : undefined}
      renderRow={(item, handleDelete) => (
        <InvoiceRow
          key={item._id}
          item={item}
          handleDelete={handleDelete}
          canDelete={canDelete}
        />
      )}
      title="Invoices"
      description="Manage your invoices and payments"
      addLink="/finance/invoices/new"
      addLabel="New Invoice"
      emptyMessage="No invoices yet"
    />
  );
}

export default InvoicesPage;
