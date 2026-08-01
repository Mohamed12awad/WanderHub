import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getBalanceSheet } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { useLanguage } from "@/contexts/LanguageContext";

interface Row { code: string; name: string; amount: string }
interface BS {
  assets: Row[]; liabilities: Row[]; equity: Row[];
  totalAssets: string; totalLiabilities: string; totalEquity: string; balanced: boolean;
}

const num = (v: string) => (parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

export default function BalanceSheet() {
  const { tr } = useLanguage();
  const [asOf, setAsOf] = useState(today());
  const accounting = tr.accounting;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.accounting.balanceSheet(asOf),
    queryFn: () => getBalanceSheet({ asOf }),
    staleTime: 15000,
  });
  const bs: BS | undefined = data?.data;

  const Section = ({ title, rows, total }: { title: string; rows: Row[]; total: string }) => (
    <>
      <TableRow className="bg-muted/40"><TableCell colSpan={2} className="font-semibold">{title}</TableCell></TableRow>
      {rows.length === 0 ? (
        <TableRow><TableCell colSpan={2} className="text-sm text-muted-foreground ps-6">{accounting.none}</TableCell></TableRow>
      ) : rows.map((r) => (
        <TableRow key={r.code + r.name}>
          <TableCell dir="auto" className="ps-6"><span className="font-mono text-xs text-muted-foreground me-2">{r.code}</span>{r.name}</TableCell>
          <TableCell className="text-right font-mono">{num(r.amount)}</TableCell>
        </TableRow>
      ))}
      <TableRow>
        <TableCell className="font-medium text-end">{accounting.totalSection(title)}</TableCell>
        <TableCell className="text-right font-mono font-semibold border-t">{num(total)}</TableCell>
      </TableRow>
    </>
  );

  return (
    <PageShell width="narrow">
      <PageHeader
        title={accounting.balanceSheet}
        badges={bs && (
          <Badge variant="outline" className={bs.balanced
            ? "border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "border-0 bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"}>
            {bs.balanced ? accounting.balanced : accounting.outOfBalance}
          </Badge>
        )}
        primaryAction={
          <div className="space-y-1"><Label className="text-xs">{accounting.asOf}</Label><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-9" /></div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading || !bs ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{accounting.loading}</div>
          ) : (
            <Table>
              <TableBody>
                <Section title={accounting.accountTypes.asset} rows={bs.assets} total={bs.totalAssets} />
                <Section title={accounting.accountTypes.liability} rows={bs.liabilities} total={bs.totalLiabilities} />
                <Section title={accounting.accountTypes.equity} rows={bs.equity} total={bs.totalEquity} />
                <TableRow className="border-t-2">
                  <TableCell className="font-bold">{accounting.liabilitiesPlusEquity}</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {num(String(parseFloat(bs.totalLiabilities) + parseFloat(bs.totalEquity)))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
