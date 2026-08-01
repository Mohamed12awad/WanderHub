import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { ReceiptText, CircleDollarSign, AlertCircle, MoreHorizontal, Edit, ArrowRightLeft, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FinanceStatusBadge } from "@/components/Finance/FinanceStatusBadge";

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

function serverParams(params: TableParams) {
  const { filters = {}, ...pageParams } = params;
  return {
    ...pageParams,
    ...filters,
  };
}

function fetchQuotesForTable(params: TableParams) {
  return getQuotes(serverParams(params));
}

function fetchInvoicesForTable(params: TableParams) {
  return getInvoices(serverParams(params));
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
  const { tr, formatCurrency, formatDate } = useLanguage();
  const f = tr.finance;
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'quotes:delete');
  const [quotesView, setQuotesView] = useState<"list" | "board">("list");
  const quotesSwitch = <ViewSwitch active={quotesView} onChange={setQuotesView} />;

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
      fetchData={fetchQuotesForTable}
      deleteData={deleteQuote}
      columns={[
        { id: "quoteNumber", header: f.quoteNumber, sortKey: "quoteNumber", kind: "text", hideable: false, cell: (quote) => <span className="font-mono text-xs text-muted-foreground">{quote.quoteNumber}</span> },
        { id: "title", header: f.titleHeader, kind: "text", cell: (quote) => <span className="font-medium max-w-[180px] truncate">{quote.title}</span> },
        {
          id: "customer",
          header: f.customer,
          kind: "text",
          cell: (quote) => <Link to={`/customers/${quote.customer._id}`} className="text-primary hover:underline text-sm" onClick={(event) => event.stopPropagation()}>{quote.customer.name}</Link>,
        },
        { id: "status", header: f.status, kind: "status", cell: (quote) => <FinanceStatusBadge status={quote.status} type="quote" /> },
        {
          id: "approval",
          header: f.approval,
          kind: "status",
          cell: (quote) => quote.convertedToInvoice ? (
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">Converted</Badge>
          ) : <span className="text-xs text-muted-foreground capitalize">{quote.approvalStatus ?? "—"}</span>,
        },
        { id: "total", header: f.amount, sortKey: "total", kind: "number", cell: (quote) => <span className="font-medium">{formatCurrency(quote.total, quote.currency)}</span> },
        { id: "validUntil", header: f.validUntil, sortKey: "validUntil", kind: "date", cell: (quote) => <span className="text-muted-foreground text-xs tabular-nums">{quote.validUntil ? formatDate(quote.validUntil) : "—"}</span> },
        { id: "createdAt", header: tr.common.created, sortKey: "createdAt", kind: "date", cell: (quote) => <span className="text-muted-foreground text-xs tabular-nums">{formatDate(quote.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span> },
      ]}
      onRowClick={(quote) => navigate(`/finance/quotes/${quote._id}`)}
      renderActions={(quote, handleDelete) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /><span className="sr-only">Actions</span></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/finance/quotes/${quote._id}`)}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/finance/quotes/${quote._id}/edit`)}><Edit className="h-3.5 w-3.5 me-2" />Edit</DropdownMenuItem>
            {!quote.convertedToInvoice && <DropdownMenuItem onClick={() => handleConvert(quote._id)}><ArrowRightLeft className="h-3.5 w-3.5 me-2" />Convert to Invoice</DropdownMenuItem>}
            {canDelete && (
              <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(quote._id)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 me-2" />Delete</DropdownMenuItem></>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      quickStatusFilter={{
        field: "status",
        options: QUOTE_STATUSES.map((s) => ({ value: s, label: f.quoteStatuses[s] })),
      }}
      filterConfigs={filterConfigs}
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
  const { tr, formatCurrency, formatDate } = useLanguage();
  const f = tr.finance;
  const navigate = useNavigate();
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'invoices:delete');

  const { data: summaryData } = useQuery({
    queryKey: ["invoices-summary"],
    queryFn: getInvoiceSummary,
    staleTime: 30_000
  });
  const summary: InvoiceSummary | undefined = summaryData?.data;

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
      fetchData={fetchInvoicesForTable}
      deleteData={deleteInvoice}
      columns={[
        { id: "invoiceNumber", header: f.invoiceNumber, sortKey: "invoiceNumber", kind: "text", hideable: false, cell: (invoice) => <span className="font-mono text-xs text-muted-foreground">{invoice.invoiceNumber}</span> },
        { id: "title", header: f.titleHeader, kind: "text", cell: (invoice) => <span className="font-medium max-w-[180px] truncate">{invoice.title}</span> },
        {
          id: "customer",
          header: f.customer,
          kind: "text",
          cell: (invoice) => <Link to={`/customers/${invoice.customer._id}`} className="text-primary hover:underline text-sm" onClick={(event) => event.stopPropagation()}>{invoice.customer.name}</Link>,
        },
        { id: "status", header: f.status, kind: "status", cell: (invoice) => <FinanceStatusBadge status={invoice.status} type="invoice" /> },
        { id: "total", header: f.total, sortKey: "total", kind: "number", cell: (invoice) => <span className="font-medium">{formatCurrency(invoice.total, invoice.currency)}</span> },
        {
          id: "outstanding",
          header: f.outstanding,
          kind: "number",
          cell: (invoice) => {
            const outstanding = invoice.total - invoice.totalPaid;
            const isOverdue = invoice.status === "overdue";
            return <span className={`font-medium ${outstanding > 0 ? isOverdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>{formatCurrency(outstanding, invoice.currency)}</span>;
          },
        },
        { id: "dueDate", header: f.dueDate, sortKey: "dueDate", kind: "date", cell: (invoice) => <span className="text-muted-foreground text-xs tabular-nums">{invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</span> },
      ]}
      onRowClick={(invoice) => navigate(`/finance/invoices/${invoice._id}`)}
      renderActions={(invoice, handleDelete) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /><span className="sr-only">Actions</span></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/finance/invoices/${invoice._id}`)}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/finance/invoices/${invoice._id}/edit`)}><Edit className="h-3.5 w-3.5 me-2" />Edit</DropdownMenuItem>
            {canDelete && (
              <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(invoice._id)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 me-2" />Delete</DropdownMenuItem></>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      quickStatusFilter={{
        field: "status",
        options: INVOICE_STATUSES.map((s) => ({ value: s, label: f.invoiceStatuses[s] })),
      }}
      filterConfigs={filterConfigs}
      topContent={summary?.hasInvoices ? <InvoiceSummaryBar summary={summary} /> : undefined}
      title={f.invoices}
      description={f.invoicesDescription}
      addLink="/finance/invoices/new"
      addLabel={f.newInvoice}
      emptyMessage={f.noInvoicesShort}
    />
  );
}

export default InvoicesPage;
