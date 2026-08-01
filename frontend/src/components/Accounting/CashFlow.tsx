import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getCashFlowStatement } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { useLanguage } from "@/contexts/LanguageContext";

interface Row { code: string; name: string; amount: string }
interface CF { rows: Row[]; openingCash: string; closingCash: string; netChange: string }

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

export default function CashFlow() {
  const { tr, formatNumber } = useLanguage();
  const num = (v: string) => formatNumber(parseFloat(v) || 0, { minimumFractionDigits: 2 });
  const [start, setStart] = useState(yearStart());
  const [end, setEnd] = useState(today());
  const accounting = tr.accounting;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.accounting.cashFlow(start, end),
    queryFn: () => getCashFlowStatement({ start, end }),
    staleTime: 15000,
  });
  const cf: CF | undefined = data?.data;

  return (
    <PageShell width="narrow">
      <PageHeader
        title={accounting.cashFlow}
        primaryAction={
          <div className="flex items-end gap-2">
            <div className="space-y-1"><Label className="text-xs">{accounting.from}</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">{accounting.to}</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" /></div>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading || !cf ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{accounting.loading}</div>
          ) : (
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{accounting.openingCash}</TableCell>
                  <TableCell className="text-right font-mono">{num(cf.openingCash)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/40"><TableCell colSpan={2} className="font-semibold">{accounting.movementsByAccount}</TableCell></TableRow>
                {cf.rows.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-sm text-muted-foreground ps-6">{accounting.noCashMovement}</TableCell></TableRow>
                ) : cf.rows.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell dir="auto" className="ps-6"><span className="font-mono text-xs text-muted-foreground me-2">{r.code}</span>{r.name}</TableCell>
                    <TableCell className={`text-right font-mono ${parseFloat(r.amount) < 0 ? "text-rose-600" : ""}`}>{num(r.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium text-end">{accounting.netChange}</TableCell>
                  <TableCell className="text-right font-mono font-semibold border-t">{num(cf.netChange)}</TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-bold">{accounting.closingCash}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{num(cf.closingCash)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
