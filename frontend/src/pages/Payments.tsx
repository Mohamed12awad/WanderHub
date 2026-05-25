import React from "react";
import { Link } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "react-query";
import { useSearchParams } from "react-router-dom";
import { getPayments } from "@/utils/api";
import { Pagination } from "@/components/ui/pagination";
import LoadingSpinner from "@/components/common/spinner";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  bank_transfer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  card: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cheque: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

interface PaymentRecord {
  _id: string;
  invoice: {
    _id: string;
    invoiceNumber: string;
    title: string;
    customer: { _id: string; name: string };
  };
  amount: number;
  currency: string;
  date: string;
  method: string;
  reference?: string;
  createdBy?: { name: string };
}

const Payments: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.max(10, parseInt(searchParams.get("limit") ?? "25"));

  const setPage = (p: number) => setSearchParams((prev) => { prev.set("page", String(p)); return prev; });
  const setLimit = (l: number) => setSearchParams((prev) => { prev.set("limit", String(l)); prev.set("page", "1"); return prev; });

  const { data, isLoading } = useQuery(
    ["payments", page, limit],
    () => getPayments({ page, limit }),
    { keepPreviousData: true }
  );

  const payments: PaymentRecord[] = data?.data?.data ?? [];
  const paginationInfo = data?.data?.pages != null
    ? { page: data.data.page, pages: data.data.pages, total: data.data.total }
    : null;

  return (
    <main className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner loading />
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No payments recorded yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="hidden md:table-cell">Reference</TableHead>
                      <TableHead className="hidden md:table-cell">Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(p.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {p.invoice?.customer ? (
                            <Link
                              to={`/customers/${p.invoice.customer._id}`}
                              className="text-blue-500 hover:underline"
                            >
                              {p.invoice.customer.name}
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {p.invoice ? (
                            <Link
                              to={`/finance/invoices/${p.invoice._id}`}
                              className="font-mono text-sm text-blue-500 hover:underline"
                            >
                              {p.invoice.invoiceNumber}
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {p.amount.toLocaleString()} {p.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={METHOD_COLORS[p.method] ?? METHOD_COLORS.other}>
                            {METHOD_LABELS[p.method] ?? p.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {p.reference ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {p.createdBy?.name ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {paginationInfo && (
                <div className="mt-4">
                  <Pagination
                    page={paginationInfo.page}
                    pages={paginationInfo.pages}
                    total={paginationInfo.total}
                    limit={limit}
                    onPageChange={setPage}
                    onLimitChange={setLimit}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Payments;
