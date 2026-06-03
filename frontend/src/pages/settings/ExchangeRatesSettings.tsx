import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getExchangeRates, upsertExchangeRate, getOrgSettings } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

interface Rate {
  id: string;
  currency: string;
  baseCurrency: string;
  rate: number;
  asOf: string;
}

export default function ExchangeRatesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currency, setCurrency] = useState("");
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: orgData } = useQuery({ queryKey: ["orgSettings"], queryFn: getOrgSettings, staleTime: 60000 });
  const baseCurrency: string = orgData?.data?.baseCurrency ?? "EGP";

  const { data } = useQuery({ queryKey: ["exchange-rates"], queryFn: getExchangeRates, staleTime: 30000 });
  const rates: Rate[] = data?.data ?? [];

  const openCreate = () => { setCurrency(""); setRate(""); setDialogOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cur = currency.trim().toUpperCase();
    const r = parseFloat(rate);
    if (!cur || !r || r <= 0) {
      toast({ title: "Enter a currency and a positive rate.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await upsertExchangeRate({ currency: cur, rate: r });
      toast({ title: "Exchange rate saved." });
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      setDialogOpen(false);
    } catch {
      toast({ title: "Failed to save exchange rate", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Exchange Rates</h2>
          <p className="text-sm text-muted-foreground">
            Manual rates used to consolidate multi-currency figures to the base currency
            (<Badge variant="outline">{baseCurrency}</Badge>). 1 unit of a currency = rate × {baseCurrency}.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 me-1" />Add / Update Rate
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {rates.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No exchange rates yet. Reports will sum each currency separately until you add rates.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Rate (→ {baseCurrency})</TableHead>
                  <TableHead>As of</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.currency}</TableCell>
                    <TableCell className="text-right font-mono">{r.rate}</TableCell>
                    <TableCell>{new Date(r.asOf).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add / Update Exchange Rate</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rate (in {baseCurrency})</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 49.5"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Adding a rate for an existing currency records a new value; the latest one is used.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
