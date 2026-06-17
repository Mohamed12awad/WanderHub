import { useState, type ElementType } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Landmark, Wallet, Lock } from "lucide-react";
import { getAccountStatement } from "@/utils/api";
import type { AccountType } from "@/types/types";

const TYPE_ICONS: Record<string, ElementType> = { bank: Landmark, cash: Wallet, safe: Lock };

interface Txn {
  _id?: string;
  id?: string;
  date: string;
  direction: "in" | "out";
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  title: string | null;
  refType: "invoice" | "bill";
  refId: string | null;
}

interface AccountInfo {
  _id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
}

export default function AccountStatement() {
  const { id = "" } = useParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const { data, isPending, error } = useQuery({
    queryKey: ["account-statement", id, page, limit],
    queryFn: () => getAccountStatement(id, { page, limit }),
    placeholderData: keepPreviousData,
  });

  const account: AccountInfo | undefined = data?.data?.account;
  const txns: Txn[] = data?.data?.data ?? [];
  const total: number = data?.data?.total ?? 0;
  const pages: number = data?.data?.pages ?? 1;
  const Icon = account ? TYPE_ICONS[account.type] ?? Wallet : Wallet;

  return (
    <div className="page-w-narrow page-pad page-gap">
      <Link to="/settings/accounts" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to accounts
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-4 w-4 text-primary" /></div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">{account?.name ?? "Account"}</h2>
            <p className="text-xs text-muted-foreground capitalize">{account?.type} · {account?.currency}</p>
          </div>
        </div>
        {account && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current balance</p>
            <p className="text-xl font-bold tabular-nums">{account.balance.toLocaleString()} {account.currency}</p>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="py-12 text-center text-sm text-destructive">Failed to load transactions.</div>
          ) : isPending ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : txns.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No transactions for this account yet.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.map((t, i) => {
                    const isIn = t.direction === "in";
                    const href = t.refId
                      ? t.refType === "invoice" ? `/finance/invoices/${t.refId}` : `/procurement/bills/${t.refId}`
                      : null;
                    return (
                      <TableRow key={t._id ?? t.id ?? i}>
                        <TableCell className="text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isIn ? "border-green-300 text-green-600" : "border-red-300 text-red-600"}>
                            {isIn ? <ArrowDownLeft className="h-3 w-3 me-1" /> : <ArrowUpRight className="h-3 w-3 me-1" />}
                            {isIn ? "In" : "Out"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {href && t.reference ? (
                            <Link to={href} className="text-blue-500 hover:underline font-mono">{t.reference}</Link>
                          ) : (
                            <span className="text-muted-foreground">{t.title ?? "—"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm capitalize text-muted-foreground">{t.method?.replace(/_/g, " ")}</TableCell>
                        <TableCell className={`text-right font-medium tabular-nums ${isIn ? "text-green-600" : "text-red-600"}`}>
                          {isIn ? "+" : "−"}{t.amount.toLocaleString()} {t.currency}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                pages={pages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(l) => { setLimit(l); setPage(1); }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
