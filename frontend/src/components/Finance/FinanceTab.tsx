import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye } from "lucide-react";
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
}

const FinanceTab: React.FC<Props> = ({ linkedModel, linkedId, customerId }) => {
  const { tr } = useLanguage();
  const f = tr.finance;

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

  return (
    <Tabs defaultValue="quotes">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="quotes">
            {f.quotes}
            {quotes.length > 0 && (
              <span className="ms-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5">
                {quotes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            {f.invoices}
            {invoices.length > 0 && (
              <span className="ms-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5">
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
        {loadingQ ? (
          <p className="text-sm text-muted-foreground py-4">{tr.common.loading}</p>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{f.noQuotes}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.quoteNumber}</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>{f.status}</TableHead>
                <TableHead className="text-right">{f.total}</TableHead>
                <TableHead className="hidden md:table-cell">{f.validUntil}</TableHead>
                <TableHead><span className="sr-only">View</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q._id}>
                  <TableCell className="font-mono text-sm">{q.quoteNumber}</TableCell>
                  <TableCell>{q.title}</TableCell>
                  <TableCell><FinanceStatusBadge status={q.status} type="quote" /></TableCell>
                  <TableCell className="text-right font-medium">
                    {q.total.toLocaleString()} {q.currency}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Link to={`/finance/quotes/${q._id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="invoices">
        {loadingI ? (
          <p className="text-sm text-muted-foreground py-4">{tr.common.loading}</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{f.noInvoices}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.invoiceNumber}</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>{f.status}</TableHead>
                <TableHead className="text-right">{f.total}</TableHead>
                <TableHead className="text-right hidden md:table-cell">{f.outstanding}</TableHead>
                <TableHead className="hidden md:table-cell">{f.dueDate}</TableHead>
                <TableHead><span className="sr-only">View</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const outstanding = inv.total - inv.totalPaid;
                return (
                  <TableRow key={inv._id}>
                    <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.title}</TableCell>
                    <TableCell><FinanceStatusBadge status={inv.status} type="invoice" /></TableCell>
                    <TableCell className="text-right font-medium">
                      {inv.total.toLocaleString()} {inv.currency}
                    </TableCell>
                    <TableCell className={`text-right hidden md:table-cell font-medium ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                      {outstanding.toLocaleString()} {inv.currency}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Link to={`/finance/invoices/${inv._id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default FinanceTab;
