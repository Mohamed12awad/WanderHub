import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { ReceiptText, CircleDollarSign, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getQuotes, getInvoices, getInvoiceSummary, deleteQuote, deleteInvoice, convertQuoteToInvoice,
} from "@/utils/api";
import { GenericTable, FilterConfig } from "@/components/common/GenericTable";
import { ViewSwitch } from "@/components/common/ViewSwitch";
import QuotesBoard from "@/components/Finance/QuotesBoard";
import { useAuth } from "@/contexts/authContext";
import { Quote, Invoice, QuoteStatus, InvoiceStatus } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import QuoteRow from "@/components/Finance/QuoteRow";
import InvoiceRow from "@/components/Finance/InvoiceRow";

// ── Constants ──────────────────────────────────────────────────────────────────

const QUOTE_STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "rejected", "expired"];
const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];
const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"];
const APPROVAL_STATUSES = ["pending", "approved", "rejected"];

// ── Server-side table queries ─────────────────────────────────────────────────

type TableParams = {
  page: number;
  limit: number;
  q: string;
  filters?: Record<string, string>;
  sort?: string;
  dir?: "asc" | "desc";
};

function serverParams(params: TableParams, sortMap: Record<string, string>) {
  const { filters = {}, sort, dir, ...pageParams } = params;
  const serverSort = sort ? sortMap[sort] : undefined;
  return {
    ...pageParams,
    ...filters,
    ...(serverSort ? { sort: serverSort, dir } : {}),
  };
}

function fetchQuotesForTable(params: TableParams, sortMap: Record<string, string>) {
  return getQuotes(serverParams(params, sortMap));
}

function fetchInvoicesForTable(params: TableParams, sortMap: Record<string, string>) {
  return getInvoices(serverParams(params, sortMap));
}

// ── Invoice summary bar ───────────────────────────────────────────────────────

type InvoiceSummary = {
  hasInvoices: boolean;
  invoiced: [string, number][];
  collected: [string, number][];
  outstanding: [string, number][];
  overdue: number;
};

function CurrencyAmounts({ entries, className }: { entries: [string, number][]; className?: string }) {
  const { formatCurrency } = useLanguage();
  if (entries.length === 0) return <span className={`font-semibold tabular-nums ${className ?? ""}`}>0</span>;
  return (
    <>
      {entries.map(([cur, val], idx) => (
        <span key={cur} className="tabular-nums">
          {idx > 0 && <span className="text-border mx-1">·</span>}
          <span className={`font-semibold ${className ?? ""}`}>{formatCurrency(val, cur)}</span>
        </span>
      ))}
    </>
  );
}

function InvoiceSummaryBar({ summary }: { summary: InvoiceSummary }) {
  const { tr } = useLanguage();
  const f = tr.finance;
  const hasOutstanding = summary.outstanding.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <ReceiptText className="h-3.5 w-3.5 text-purple-500 shrink-0" />
        <span className="text-muted-foreground text-xs">{f.invoiced}</span>
        <CurrencyAmounts entries={summary.invoiced} />
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <CircleDollarSign className="h-3.5 w-3.5 text-green-500 shrink-0" />
        <span className="text-muted-foreground text-xs">{f.collected}</span>
        <CurrencyAmounts entries={summary.collected} className="text-green-600 dark:text-green-400" />
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
        <span className="text-muted-foreground text-xs">{f.outstanding}</span>
        <CurrencyAmounts
          entries={summary.outstanding}
          className={hasOutstanding ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
        />
        {!hasOutstanding && <span className="font-semibold text-green-600 dark:text-green-400 tabular-nums">0</span>}
        {summary.overdue > 0 && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            {f.overdueCount(summary.overdue)}
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
  const { tr } = useLanguage();
  const f = tr.finance;
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'quotes:delete');
  const [quotesView, setQuotesView] = useState<"list" | "board">("list");
  const quotesSwitch = <ViewSwitch active={quotesView} onChange={setQuotesView} />;

  // GenericTable emits translated header labels; map them to stable API fields.
  const headers = useMemo(
    () => [f.quoteNumber, f.titleHeader, f.customer, f.status, f.approval, f.amount, f.validUntil, tr.common.created],
    [tr],
  );
  const sortableHeaders = useMemo(() => [f.quoteNumber, f.amount, f.validUntil, tr.common.created], [tr]);
  const sortMap = useMemo<Record<string, string>>(
    () => ({ [f.quoteNumber]: "quoteNumber", [f.amount]: "total", [f.validUntil]: "validUntil", [tr.common.created]: "createdAt" }),
    [tr],
  );
  const filterConfigs = useMemo<FilterConfig[]>(() => [
    { label: f.currency, field: "currency", type: "select", options: CURRENCIES.map((c) => ({ label: c, value: c })) },
    { label: f.approvalStatus, field: "approvalStatus", type: "select", options: APPROVAL_STATUSES.map((s) => ({ label: f.approvalStatuses[s], value: s })) },
    { label: f.amount, field: "total", type: "number-range" },
    { label: f.validUntil, field: "validUntil", type: "date-range" },
    { label: tr.common.created, field: "createdAt", type: "date-range" },
  ], [tr]);

  const handleConvert = useCallback(async (id: string) => {
    try {
      const res = await convertQuoteToInvoice(id);
      queryClient.invalidateQueries({ queryKey: ["quotes-gt"] });
      toast({ title: f.convertedToInvoice });
      navigate(`/finance/invoices/${res.data._id}`);
    } catch {
      toast({ title: f.conversionFailed, variant: "destructive" });
    }
  }, [navigate, queryClient, toast, f]);

  if (quotesView === "board") return <QuotesBoard headerExtra={quotesSwitch} />;

  return (
    <GenericTable<Quote>
      queryKey="quotes-gt"
      headerExtra={quotesSwitch}
      fetchData={(p) => fetchQuotesForTable(p, sortMap)}
      deleteData={deleteQuote}
      headers={headers}
      sortableHeaders={sortableHeaders}
      quickStatusFilter={{
        field: "status",
        options: QUOTE_STATUSES.map((s) => ({ value: s, label: f.quoteStatuses[s] })),
      }}
      filterConfigs={filterConfigs}
      renderRow={(item, handleDelete) => (
        <QuoteRow
          key={item._id}
          item={item}
          handleDelete={handleDelete}
          handleConvert={handleConvert}
          canDelete={canDelete}
        />
      )}
      title={f.quotes}
      description={f.quotesDescription}
      addLink="/finance/quotes/new"
      addLabel={f.newQuote}
      emptyMessage={f.noQuotesShort}
    />
  );
}

// ── Invoices Page ─────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const { user } = useAuth();
  const { tr } = useLanguage();
  const f = tr.finance;
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'invoices:delete');

  const { data: summaryData } = useQuery({
    queryKey: ["invoices-summary"],
    queryFn: getInvoiceSummary,
    staleTime: 30_000
  });
  const summary: InvoiceSummary | undefined = summaryData?.data;

  const headers = useMemo(
    () => [f.invoiceNumber, f.titleHeader, f.customer, f.status, f.total, f.outstanding, f.dueDate],
    [tr],
  );
  const sortableHeaders = useMemo(() => [f.invoiceNumber, f.total, f.dueDate], [tr]);
  const sortMap = useMemo<Record<string, string>>(
    () => ({ [f.invoiceNumber]: "invoiceNumber", [f.total]: "total", [f.dueDate]: "dueDate" }),
    [tr],
  );
  const filterConfigs = useMemo<FilterConfig[]>(() => [
    { label: f.currency, field: "currency", type: "select", options: CURRENCIES.map((c) => ({ label: c, value: c })) },
    { label: f.approvalStatus, field: "approvalStatus", type: "select", options: APPROVAL_STATUSES.map((s) => ({ label: f.approvalStatuses[s], value: s })) },
    { label: f.amount, field: "total", type: "number-range" },
    { label: f.issueDate, field: "issueDate", type: "date-range" },
    { label: f.dueDate, field: "dueDate", type: "date-range" },
    { label: tr.common.created, field: "createdAt", type: "date-range" },
  ], [tr]);

  return (
    <GenericTable<Invoice>
      queryKey="invoices-gt"
      fetchData={(p) => fetchInvoicesForTable(p, sortMap)}
      deleteData={deleteInvoice}
      headers={headers}
      sortableHeaders={sortableHeaders}
      quickStatusFilter={{
        field: "status",
        options: INVOICE_STATUSES.map((s) => ({ value: s, label: f.invoiceStatuses[s] })),
      }}
      filterConfigs={filterConfigs}
      topContent={summary?.hasInvoices ? <InvoiceSummaryBar summary={summary} /> : undefined}
      renderRow={(item, handleDelete) => (
        <InvoiceRow
          key={item._id}
          item={item}
          handleDelete={handleDelete}
          canDelete={canDelete}
        />
      )}
      title={f.invoices}
      description={f.invoicesDescription}
      addLink="/finance/invoices/new"
      addLabel={f.newInvoice}
      emptyMessage={f.noInvoicesShort}
    />
  );
}

export default InvoicesPage;
