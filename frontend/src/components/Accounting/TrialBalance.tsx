import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getTrialBalance } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { useLanguage } from "@/contexts/LanguageContext";

interface TBRow { accountId: string; code: string; name: string; type: string; debit: string; credit: string }
interface TB { asOf: string | null; rows: TBRow[]; totalDebit: string; totalCredit: string; balanced: boolean }

export default function TrialBalance() {
  const { tr, formatNumber } = useLanguage();
  const num = (v: string) => formatNumber(parseFloat(v) || 0, { minimumFractionDigits: 2 });
  const a = tr.accounting;
  const [asOf, setAsOf] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.accounting.trialBalance(asOf || undefined),
    queryFn: () => getTrialBalance(asOf ? { asOf } : undefined),
    staleTime: 15000,
  });
  const tb: TB | undefined = data?.data;

  return (
    <PageShell width="narrow">
      <PageHeader
        title={a.trialBalance}
        description={a.trialBalanceDescription}
        badges={tb && (
          <Badge
            variant="outline"
            className={tb.balanced
              ? "border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "border-0 bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"}
          >
            {tb.balanced ? a.inBalance : a.outOfBalance}
          </Badge>
        )}
        primaryAction={
          <div className="space-y-1">
            <Label className="text-xs">{a.asOf}</Label>
            <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-9" />
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{a.loading}</div>
          ) : !tb || tb.rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{a.noPostedActivity}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{a.headers.code}</TableHead>
                  <TableHead>{a.headers.account}</TableHead>
                  <TableHead className="text-right">{a.headers.debit}</TableHead>
                  <TableHead className="text-right">{a.headers.credit}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tb.rows.map((r) => (
                  <TableRow key={r.accountId}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell dir="auto">{r.name}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(r.debit) ? num(r.debit) : ""}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(r.credit) ? num(r.credit) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">{tr.finance.total}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{num(tb.totalDebit)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{num(tb.totalCredit)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
