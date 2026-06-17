import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import { getGlConfig, updateGlConfig, getChartOfAccounts } from "@/utils/api";

interface CoaOption { _id: string; code: string; name: string }

const ACCOUNT_FIELDS: { key: string; label: string; help: string }[] = [
  { key: "defaultArAccount", label: "Accounts Receivable", help: "Debited when an invoice is issued" },
  { key: "defaultIncomeAccount", label: "Sales Income", help: "Credited with invoice revenue" },
  { key: "defaultApAccount", label: "Accounts Payable", help: "Credited when a vendor bill is recorded" },
  { key: "defaultExpense", label: "General Expense", help: "Debited for service/expense bills" },
  { key: "defaultInventoryAsset", label: "Inventory Asset", help: "Stock value on hand" },
  { key: "defaultCogs", label: "Cost of Goods Sold", help: "Debited when stock is sold" },
  { key: "defaultGrni", label: "Goods Received Not Invoiced", help: "Accrues received-but-unbilled goods" },
  { key: "defaultInventoryAdjustment", label: "Inventory Adjustment", help: "Stock write-offs / corrections" },
  { key: "defaultFxGainLossAccount", label: "FX Gain / Loss", help: "Realized exchange differences on payment" },
  { key: "defaultTaxPayable", label: "Tax Payable (fallback)", help: "Output tax when a rate has no mapping" },
  { key: "defaultTaxRecoverable", label: "Tax Recoverable (fallback)", help: "Input tax when a rate has no mapping" },
];

export default function GlMappingSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const { data: cfgData } = useQuery({ queryKey: queryKeys.accounting.glConfig, queryFn: getGlConfig });
  const { data: coaData } = useQuery({ queryKey: queryKeys.accounting.chartOfAccounts, queryFn: () => getChartOfAccounts(), staleTime: 60000 });
  const coa: CoaOption[] = coaData?.data ?? [];

  useEffect(() => {
    if (cfgData?.data) setConfig(cfgData.data as Record<string, unknown>);
  }, [cfgData]);

  const set = (key: string, value: unknown) => setConfig((c) => ({ ...c, [key]: value }));
  const str = (key: string) => (config[key] as string) ?? "";

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGlConfig(config);
      toast({ title: "GL settings saved." });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div>
        <h2 className="text-lg font-semibold">GL / Account Mapping</h2>
        <p className="text-sm text-muted-foreground">
          Map business events to general-ledger accounts and control automated posting.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Posting controls</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable automated GL posting</Label>
              <p className="text-xs text-muted-foreground">Posts journal entries from invoices, payments and bills.</p>
            </div>
            <Switch checked={!!config.glEnabled} onCheckedChange={(v) => set("glEnabled", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cutover date</Label>
              <Input
                type="date"
                value={str("glCutoverDate") ? String(str("glCutoverDate")).slice(0, 10) : ""}
                onChange={(e) => set("glCutoverDate", e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">Only documents on/after this date post to the GL.</p>
            </div>
            <div className="space-y-2">
              <Label>Default costing method</Label>
              <Select
                value={(config.defaultCostMethod as string) ?? "weighted_average"}
                onValueChange={(v) => set("defaultCostMethod", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weighted_average">Weighted Average</SelectItem>
                  <SelectItem value="fifo">FIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Account mapping</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {ACCOUNT_FIELDS.map((f) => (
            <div key={f.key} className="grid grid-cols-2 gap-4 items-center">
              <div>
                <Label>{f.label}</Label>
                <p className="text-xs text-muted-foreground">{f.help}</p>
              </div>
              <Select value={str(f.key) || "none"} onValueChange={(v) => set(f.key, v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {coa.map((a) => (
                    <SelectItem key={a._id} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
