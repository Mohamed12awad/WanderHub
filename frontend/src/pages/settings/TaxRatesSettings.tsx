import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTaxRates, createTaxRate, updateTaxRate, deleteTaxRate, getChartOfAccounts } from "@/utils/api";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  liabilityAccountCode?: string | null;
  inputAccountCode?: string | null;
  createdAt: string;
}

interface FormState { name: string; rate: string; isDefault: boolean; liabilityAccountCode: string; inputAccountCode: string; }
const emptyForm = (): FormState => ({ name: "", rate: "", isDefault: false, liabilityAccountCode: "", inputAccountCode: "" });

export default function TaxRatesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TaxRate | null>(null);

  const { data } = useQuery({
    queryKey: ["tax-rates"],
    queryFn: getTaxRates,
    staleTime: 30000,
  });
  const taxRates: TaxRate[] = data?.data ?? [];

  const { data: coaData } = useQuery({ queryKey: queryKeys.accounting.chartOfAccounts, queryFn: () => getChartOfAccounts(), staleTime: 60000 });
  const accounts: { _id: string; code: string; name: string }[] = coaData?.data ?? [];

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (t: TaxRate) => {
    setEditing(t);
    setForm({ name: t.name, rate: String(t.rate), isDefault: t.isDefault, liabilityAccountCode: t.liabilityAccountCode ?? "", inputAccountCode: t.inputAccountCode ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(form.rate);
    if (!form.name.trim() || isNaN(rate) || rate < 0 || rate > 100) {
      toast({ title: "Enter a valid name and rate (0–100).", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(), rate, isDefault: form.isDefault,
      liabilityAccountCode: form.liabilityAccountCode || null,
      inputAccountCode: form.inputAccountCode || null,
    };
    try {
      if (editing) {
        await updateTaxRate(editing.id, payload);
        toast({ title: "Tax rate updated." });
      } else {
        await createTaxRate(payload);
        toast({ title: "Tax rate created." });
      }
      queryClient.invalidateQueries({ queryKey: ["tax-rates"] });
      setDialogOpen(false);
    } catch {
      toast({ title: "Failed to save tax rate.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TaxRate) => {
    try {
      await deleteTaxRate(t.id);
      toast({ title: "Tax rate deleted." });
      queryClient.invalidateQueries({ queryKey: ["tax-rates"] });
    } catch {
      toast({ title: "Failed to delete.", variant: "destructive" });
    }
  };

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tax Rates</h2>
          <p className="text-sm text-muted-foreground">Reusable tax rates for invoices and quotes.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 me-1" />Add Tax Rate
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {taxRates.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No tax rates yet. Add one to start selecting rates on invoices.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-20"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxRates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono">{t.rate}%</TableCell>
                    <TableCell>
                      {t.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => setPendingDelete(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tax Rate" : "Add Tax Rate"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. VAT 14%, Sales Tax"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                placeholder="e.g. 14"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Output tax account (sales)</Label>
              <Select value={form.liabilityAccountCode || "none"} onValueChange={(v) => setForm({ ...form, liabilityAccountCode: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Use GL default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Use GL default</SelectItem>
                  {accounts.map((a) => <SelectItem key={a._id} value={a.code}>{a.code} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Input tax account (purchases)</Label>
              <Select value={form.inputAccountCode || "none"} onValueChange={(v) => setForm({ ...form, inputAccountCode: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Use GL default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Use GL default</SelectItem>
                  {accounts.map((a) => <SelectItem key={a._id} value={a.code}>{a.code} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isDefault}
                onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
                id="is-default"
              />
              <Label htmlFor="is-default" className="cursor-pointer">Set as default rate</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={pendingDelete !== null}
        onConfirm={() => {
          const taxRate = pendingDelete;
          setPendingDelete(null);
          if (taxRate) void handleDelete(taxRate);
        }}
        onCancel={() => setPendingDelete(null)}
        title="Delete Tax Rate"
        description={pendingDelete ? `Delete "${pendingDelete.name}"? This cannot be undone.` : undefined}
      />
    </div>
  );
}
