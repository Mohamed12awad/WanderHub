import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye } from "lucide-react";
import { useQuery } from "react-query";
import { getQuotes, getInvoices } from "@/utils/api";
import { FinanceStatusBadge } from "@/components/Finance/FinanceStatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingSpinner from "@/components/common/spinner";
import { Quote, Invoice } from "@/types/types";

const FinancePage: React.FC = () => {
  const { tr } = useLanguage();
  const f = tr.finance;
  const location = useLocation();

  const defaultTab = location.pathname.startsWith("/finance/invoices") ? "invoices" : "quotes";
  const [tab, setTab] = useState(defaultTab);
  const [search, setSearch] = useState("");

  const { data: quotesData, isLoading: loadingQuotes } = useQuery(
    "quotes",
    () => getQuotes(),
    { enabled: tab === "quotes" }
  );
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery(
    "invoices",
    () => getInvoices(),
    { enabled: tab === "invoices" }
  );

  const quotes: Quote[] = (quotesData?.data ?? []).filter((q: Quote) =>
    !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
    q.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const invoices: Invoice[] = (invoicesData?.data ?? []).filter((inv: Invoice) =>
    !search || inv.title.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>{f.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="quotes">{f.quotes}</TabsTrigger>
                <TabsTrigger value="invoices">{f.invoices}</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tr.common.search}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-48 pl-8"
                  />
                </div>
                {tab === "quotes" ? (
                  <Link to="/finance/quotes/new">
                    <Button size="sm" className="h-8 px-4">
                      <Plus className="h-3.5 w-3.5 me-1" />
                      {f.newQuote}
                    </Button>
                  </Link>
                ) : (
                  <Link to="/finance/invoices/new">
                    <Button size="sm" className="h-8 px-4">
                      <Plus className="h-3.5 w-3.5 me-1" />
                      {f.newInvoice}
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <TabsContent value="quotes">
              {loadingQuotes ? (
                <LoadingSpinner loading />
              ) : quotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">{f.noQuotes}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{f.quoteNumber}</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>{f.customer}</TableHead>
                      <TableHead>{f.status}</TableHead>
                      <TableHead className="text-right">{f.total}</TableHead>
                      <TableHead className="hidden md:table-cell">{f.validUntil}</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((q) => (
                      <TableRow key={q._id}>
                        <TableCell className="font-mono text-sm">{q.quoteNumber}</TableCell>
                        <TableCell>{q.title}</TableCell>
                        <TableCell>
                          <Link to={`/customers/${q.customer._id}`} className="text-blue-500 hover:underline">
                            {q.customer.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <FinanceStatusBadge status={q.status} type="quote" />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {q.total.toLocaleString()} {q.currency}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Link to={`/finance/quotes/${q._id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
              {loadingInvoices ? (
                <LoadingSpinner loading />
              ) : invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">{f.noInvoices}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{f.invoiceNumber}</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>{f.customer}</TableHead>
                      <TableHead>{f.status}</TableHead>
                      <TableHead className="text-right">{f.total}</TableHead>
                      <TableHead className="text-right hidden md:table-cell">{f.outstanding}</TableHead>
                      <TableHead className="hidden md:table-cell">{f.dueDate}</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => {
                      const outstanding = inv.total - inv.totalPaid;
                      return (
                        <TableRow key={inv._id}>
                          <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                          <TableCell>{inv.title}</TableCell>
                          <TableCell>
                            <Link to={`/customers/${inv.customer._id}`} className="text-blue-500 hover:underline">
                              {inv.customer.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <FinanceStatusBadge status={inv.status} type="invoice" />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {inv.total.toLocaleString()} {inv.currency}
                          </TableCell>
                          <TableCell className={`text-right hidden md:table-cell font-medium ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                            {outstanding.toLocaleString()} {inv.currency}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Link to={`/finance/invoices/${inv._id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
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
        </CardContent>
      </Card>
    </main>
  );
};

export default FinancePage;
