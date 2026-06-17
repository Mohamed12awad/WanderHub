import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LockOpen } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { queryKeys } from "@/lib/queryKeys";
import { getClosedPeriods, closePeriod, reopenPeriod } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";

interface ClosedPeriod { period: string; closedAt: string }

export default function Periods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const a = tr.accounting;
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [pendingReopen, setPendingReopen] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: queryKeys.accounting.periods,
    queryFn: getClosedPeriods,
    staleTime: 15000,
  });
  const periods: ClosedPeriod[] = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.accounting.periods });

  const handleClose = async () => {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      toast({ title: a.invalidPeriod, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await closePeriod(period);
      toast({ title: a.periodClosed(period, res.data.accounts) });
      invalidate();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? a.closePeriodFailed, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async (p: string) => {
    try {
      await reopenPeriod(p);
      toast({ title: a.reopened(p) });
      invalidate();
    } catch {
      toast({ title: a.reopenFailed, variant: "destructive" });
    }
  };

  return (
    <PageShell width="narrow">
      <PageHeader
        title={a.periodClose}
        description={a.periodCloseDescription}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">{a.closeAPeriod}</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{a.month}</Label>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 w-48" />
          </div>
          <Button onClick={handleClose} disabled={busy}>{busy ? tr.common.loading : a.closePeriod}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{a.closedPeriods}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {periods.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{a.noClosedPeriods}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{a.headers.period}</TableHead>
                  <TableHead>{a.headers.closedAt}</TableHead>
                  <TableHead className="w-24"><span className="sr-only">{a.headers.actions}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.period}>
                    <TableCell className="font-mono">{p.period}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(p.closedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setPendingReopen(p.period)}>
                        <LockOpen className="h-3.5 w-3.5 me-1" />{a.reopen}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingReopen !== null}
        onConfirm={() => { const p = pendingReopen; setPendingReopen(null); if (p) void handleReopen(p); }}
        onCancel={() => setPendingReopen(null)}
        title={a.reopenPeriod}
        description={pendingReopen ? a.reopenDescription(pendingReopen) : undefined}
      />
    </PageShell>
  );
}
