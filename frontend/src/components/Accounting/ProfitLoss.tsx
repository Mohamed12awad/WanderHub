import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getIncomeStatement } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";

interface Row { code: string; name: string; amount: string }
interface PL { income: Row[]; expense: Row[]; totalIncome: string; totalExpense: string; netProfit: string }

const num = (v: string) => (parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

export default function ProfitLoss() {
  const { tr } = useLanguage();
  const [start, setStart] = useState(yearStart());
  const [end, setEnd] = useState(today());
  const accounting = tr.accounting;
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.accounting.profitLoss(start, end),
    queryFn: () => getIncomeStatement({ start, end }),
    staleTime: 15000,
  });
  const pl: PL | undefined = data?.data;

  const Section = ({ title, rows, total }: { title: string; rows: Row[]; total: string }) => (
    <>
      <TableRow className="bg-muted/40">
        <TableCell colSpan={2} className="font-semibold">{title}</TableCell>
      </TableRow>
      {rows.length === 0 ? (
        <TableRow><TableCell colSpan={2} className="text-sm text-muted-foreground ps-6">{accounting.none}</TableCell></TableRow>
      ) : rows.map((r) => (
        <TableRow key={r.code}>
          <TableCell className="ps-6"><span className="font-mono text-xs text-muted-foreground me-2">{r.code}</span>{r.name}</TableCell>
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
        title={accounting.profitLoss}
        primaryAction={
          <div className="flex items-end gap-2">
            <div className="space-y-1"><Label className="text-xs">{accounting.from}</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">{accounting.to}</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" /></div>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading || !pl ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{accounting.loading}</div>
          ) : (
            <Table>
              <TableBody>
                <Section title={accounting.accountTypes.income} rows={pl.income} total={pl.totalIncome} />
                <Section title={accounting.accountTypes.expense} rows={pl.expense} total={pl.totalExpense} />
                <TableRow className="border-t-2">
                  <TableCell className="font-bold">{accounting.netProfit}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${parseFloat(pl.netProfit) < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {num(pl.netProfit)}
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
