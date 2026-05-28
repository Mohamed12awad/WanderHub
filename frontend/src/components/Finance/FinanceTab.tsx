import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useQuery } from "react-query";
import { getQuotes, getInvoices } from "@/utils/api";
import { FinanceStatusBadge } from "./FinanceStatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Quote, Invoice } from "@/types/types";

interface Props {
  linkedModel: "Deal" | "Customer";
  linkedId: string;
  /** Customer ID — needed to pre-fill the New Quote/Invoice form when opening from a Deal */
  customerId?: string;
  /** When set, render only that section without internal sub-tabs */
  view?: "quotes" | "invoices";
}

const FinanceTab: React.FC<Props> = ({ linkedModel, linkedId, customerId, view }) => {
  const { tr } = useLanguage();
  const f = tr.finance;
  const navigate = useNavigate();

  const filterParam = linkedModel === "Deal" ? { deal: linkedId } : { customer: linkedId };
  const prefilledCustomer = linkedModel === "Customer" ? linkedId : customerId;

  const newQuoteUrl = `/finance/quotes/new?${[
    linkedModel === "Deal" ? `deal=${linkedId}` : "",
    prefilledCustomer ? `customer=${prefilledCustomer}` : "",
  ].filter(Boolean).join("&")}`;

  const newInvoiceUrl = `/finance/invoices/new?${[
    linkedModel === "Deal" ? `deal=${linkedId}` : "",
    prefilledCustomer ? `customer=${prefilledCustomer}` : "",
  ].filter(Boolean).join("&")}`;

  const { data: quotesData, isLoading: loadingQ } = useQuery(
    ["quotes", filterParam],
    () => getQuotes(filterParam)
  );
  const { data: invoicesData, isLoading: loadingI } = useQuery(
    ["invoices", filterParam],
    () => getInvoices(filterParam)
  );

  const quotes: Quote[] = quotesData?.data ?? [];
  const invoices: Invoice[] = invoicesData?.data ?? [];

  // Single-section rendering (used when parent provides separate tabs)
  if (view === "quotes") return (
    <div>
      <div className="flex justify-end mb-3">
        <Link to={newQuoteUrl}>
          <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
            <Plus className="h-3 w-3 me-1" />{f.newQuote}
          </Button>
        </Link>
      </div>
      {loadingQ ? <p className="text-sm text-muted-foreground py-4">{tr.common.loading}</p>
        : quotes.length === 0 ? <p className="text-sm text-muted-foreground py-4">{f.noQuotes}</p>
        : <QuotesTable quotes={quotes} navigate={navigate} f={f} />}
    </div>
  );

  if (view === "invoices") return (
    <div>
      <div className="flex justify-end mb-3">
        <Link to={newInvoiceUrl}>
          <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
            <Plus className="h-3 w-3 me-1" />{f.newInvoice}
          </Button>
        </Link>
      </div>
      {loadingI ? <p className="text-sm text-muted-foreground py-4">{tr.common.loading}</p>
        : invoices.length === 0 ? <p className="text-sm text-muted-foreground py-4">{f.noInvoices}</p>
        : <InvoicesTable invoices={invoices} navigate={navigate} f={f} />}
    </div>
  );

  return (
    <Tabs defaultValue="quotes">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="quotes">
            {f.quotes}
            {quotes.length > 0 && (
              <span className="ms-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold leading-none">
                {quotes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            {f.invoices}
            {invoices.length > 0 && (
              <span className="ms-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold leading-none">
                {invoices.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Link to={newQuoteUrl}>
            <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
              <Plus className="h-3 w-3 me-1" />{f.newQuote}
            </Button>
          </Link>
          <Link to={newInvoiceUrl}>
            <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
              <Plus className="h-3 w-3 me-1" />{f.newInvoice}
            </Button>
          </Link>
        </div>
      </div>

      <TabsContent value="quotes">
        {loadingQ ? <p className="text-sm text-muted-foreground py-4">{tr.common.loading}</p>
          : quotes.length === 0 ? <p className="text-sm text-muted-foreground py-4">{f.noQuotes}</p>
          : <QuotesTable quotes={quotes} navigate={navigate} f={f} />}
      </TabsContent>

      <TabsContent value="invoices">
        {loadingI ? <p className="text-sm text-muted-foreground py-4">{tr.common.loading}</p>
          : invoices.length === 0 ? <p className="text-sm text-muted-foreground py-4">{f.noInvoices}</p>
          : <InvoicesTable invoices={invoices} navigate={navigate} f={f} />}
      </TabsContent>
    </Tabs>
  );
};

const QuotesTable: React.FC<{ quotes: Quote[]; navigate: (p: string) => void; f: any }> = ({ quotes, navigate, f }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{f.quoteNumber}</TableHead>
        <TableHead>Title</TableHead>
        <TableHead>{f.status}</TableHead>
        <TableHead className="text-right">{f.total}</TableHead>
        <TableHead className="hidden md:table-cell">{f.validUntil}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {quotes.map((q) => (
        <TableRow key={q._id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/finance/quotes/${q._id}`)}>
          <TableCell className="font-mono text-sm">{q.quoteNumber}</TableCell>
          <TableCell>{q.title}</TableCell>
          <TableCell><FinanceStatusBadge status={q.status} type="quote" /></TableCell>
          <TableCell className="text-right font-medium">{q.total.toLocaleString()} {q.currency}</TableCell>
          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
            {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const InvoicesTable: React.FC<{ invoices: Invoice[]; navigate: (p: string) => void; f: any }> = ({ invoices, navigate, f }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{f.invoiceNumber}</TableHead>
        <TableHead>Title</TableHead>
        <TableHead>{f.status}</TableHead>
        <TableHead className="text-right">{f.total}</TableHead>
        <TableHead className="text-right hidden md:table-cell">{f.outstanding}</TableHead>
        <TableHead className="hidden md:table-cell">{f.dueDate}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {invoices.map((inv) => {
        const outstanding = inv.total - inv.totalPaid;
        return (
          <TableRow key={inv._id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/finance/invoices/${inv._id}`)}>
            <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
            <TableCell>{inv.title}</TableCell>
            <TableCell><FinanceStatusBadge status={inv.status} type="invoice" /></TableCell>
            <TableCell className="text-right font-medium">{inv.total.toLocaleString()} {inv.currency}</TableCell>
            <TableCell className={`text-right hidden md:table-cell font-medium ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
              {outstanding.toLocaleString()} {inv.currency}
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
              {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);

export default FinanceTab;
