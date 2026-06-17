import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getChartAccountLedger } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { useLanguage } from "@/contexts/LanguageContext";

interface Line {
  _id: string; date: string; entryId: string; entryNumber: string;
  sourceType: string; status: string; memo: string | null; debit: string; credit: string;
}
interface Ledger {
  account: { _id: string; code: string; name: string; type: string; normalBalance: "debit" | "credit" };
  data: Line[]; total: number; page: number; pages: number;
  totalDebit: string; totalCredit: string; balance: string;
}

const num = (v: string) => (parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

export default function AccountLedger() {
  const { id = "" } = useParams();
  const { tr } = useLanguage();
  const a = tr.accounting;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.accounting.accountLedger(id, page),
    queryFn: () => getChartAccountLedger(id, { page }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
  const ledger: Ledger | undefined = data?.data;

  if (isLoading && !ledger) return <PageShell width="default" state={{ isLoading: true }}>{null}</PageShell>;
  if (!ledger) return <PageShell width="default"><ErrorState title={a.accountNotFound} description={a.accountRemoved} /></PageShell>;

  const balance = parseFloat(ledger.balance);
  // Present the balance on the account's normal side.
  const normalSideBalance = ledger.account.normalBalance === "credit" ? -balance : balance;

  return (
    <PageShell width="default">
      <PageHeader
        crumbsOverride={[
          { label: a.chartOfAccounts, href: "/accounting/chart-of-accounts" },
          { label: `${ledger.account.code} ${ledger.account.name}` },
        ]}
        title={<><span className="font-mono text-base text-muted-foreground me-2">{ledger.account.code}</span>{ledger.account.name}</>}
        description={<span>{a.accountTypes[ledger.account.type] ?? ledger.account.type} · {a.normal} {a.normalBalances[ledger.account.normalBalance]}</span>}
        primaryAction={
          <div className="flex gap-4 text-sm">
            <div className="text-right"><div className="text-muted-foreground text-xs">{a.totalDebit}</div><div className="font-mono font-semibold">{num(ledger.totalDebit)}</div></div>
            <div className="text-right"><div className="text-muted-foreground text-xs">{a.totalCredit}</div><div className="font-mono font-semibold">{num(ledger.totalCredit)}</div></div>
            <div className="text-right"><div className="text-muted-foreground text-xs">{a.balance}</div><div className="font-mono font-bold">{num(String(Math.abs(normalSideBalance)))} {normalSideBalance >= 0 ? ledger.account.normalBalance.toUpperCase()[0] : (ledger.account.normalBalance === "debit" ? a.creditShort : a.debitShort)}</div></div>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {ledger.data.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{a.noPostedTransactions}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">{a.headers.date}</TableHead>
                  <TableHead className="w-28">{a.headers.entryNumber}</TableHead>
                  <TableHead>{a.headers.source}</TableHead>
                  <TableHead>{a.headers.memo}</TableHead>
                  <TableHead className="text-right">{a.headers.debit}</TableHead>
                  <TableHead className="text-right">{a.headers.credit}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.data.map((l) => (
                  <TableRow key={l._id} className={l.status === "reversed" ? "opacity-60" : ""}>
                    <TableCell className="text-xs">{new Date(l.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link to={`/accounting/journal/${l.entryId}`} className="text-primary hover:underline">{l.entryNumber}</Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.sources[l.sourceType] ?? l.sourceType}{l.status === "reversed" && <Badge variant="outline" className="ms-1 text-[10px]">{a.statuses.reversed}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{l.memo ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(l.debit) ? num(l.debit) : ""}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(l.credit) ? num(l.credit) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {ledger.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{a.pageInfo(ledger.page, ledger.pages, ledger.total)}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{a.prev}</Button>
            <Button size="sm" variant="outline" className="h-7" disabled={page >= ledger.pages} onClick={() => setPage((p) => p + 1)}>{a.next}</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
