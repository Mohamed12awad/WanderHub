import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { runReconciliation } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";

interface Report {
  ran: boolean;
  ledgerBalanced: boolean;
  ledgerDrift: number;
  arGl: number;
  arOperational: number;
  arDrift: number;
  alerts: string[];
}

const fmt = (n: number) => (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

export default function Audit() {
  const { toast } = useToast();
  const { tr } = useLanguage();
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const accounting = tr.accounting;

  const run = async () => {
    setBusy(true);
    try {
      const res = await runReconciliation();
      setReport(res.data);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? accounting.reconciliationFailed, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ label, value, ok }: { label: string; value: string; ok?: boolean }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm">{label}</span>
      <span className={`font-mono text-sm ${ok === false ? "text-rose-600 font-semibold" : ""}`}>{value}</span>
    </div>
  );

  return (
    <PageShell width="narrow">
      <PageHeader
        title={accounting.auditTitle}
        description={accounting.auditDescription}
        primaryAction={<Button onClick={run} disabled={busy}>{busy ? accounting.checking : accounting.runCheck}</Button>}
      />

      {report && !report.ran && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          {accounting.glDisabled}
        </CardContent></Card>
      )}

      {report && report.ran && (
        <>
          <Card>
            <CardContent className="py-4">
              {report.alerts.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" /><span className="font-medium">{accounting.allChecksPassed}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-rose-600"><AlertTriangle className="h-5 w-5" /><span className="font-medium">{accounting.driftDetected}</span></div>
                  {report.alerts.map((alert, i) => <p key={i} className="text-sm text-rose-700 dark:text-rose-300 ps-7">{alert}</p>)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{accounting.details}</CardTitle></CardHeader>
            <CardContent className="py-0">
              <Row label={accounting.ledgerBalancedLabel} value={report.ledgerBalanced ? accounting.yes : accounting.noWithValue(fmt(report.ledgerDrift))} ok={report.ledgerBalanced} />
              <Row label={accounting.accountsReceivableGl} value={fmt(report.arGl)} />
              <Row label={accounting.accountsReceivableOperational} value={fmt(report.arOperational)} />
              <Row label={accounting.arDrift} value={fmt(report.arDrift)} ok={Math.abs(report.arDrift) <= 1} />
            </CardContent>
          </Card>
        </>
      )}

      {!report && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          {accounting.runCheckPrompt}
        </CardContent></Card>
      )}
    </PageShell>
  );
}
