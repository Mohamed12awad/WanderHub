import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Quote as QuoteIcon } from "lucide-react";
import { getInvoiceDefaults, updateInvoiceDefaults } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

interface InvoiceDefaults {
  paymentTermsDays: number;
  notes: string;
  terms: string;
  quotesValidDays: number;
  taxInclusive: boolean;
}

const INITIAL: InvoiceDefaults = {
  paymentTermsDays: 30,
  notes: "",
  terms: "",
  quotesValidDays: 30,
  taxInclusive: false,
};

export default function InvoiceDefaultsSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState<InvoiceDefaults>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getInvoiceDefaults()
      .then((res) => {
        if (res.data && Object.keys(res.data).length) {
          setForm({ ...INITIAL, ...res.data });
        }
      })
      .catch(() => toast({ title: "Failed to load defaults.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const patch = (field: keyof InvoiceDefaults, value: string | number | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await updateInvoiceDefaults(form);
      toast({ title: "Invoice defaults saved." });
    } catch {
      toast({ title: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-w-narrow page-pad page-gap">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div>
        <h2 className="text-lg font-semibold">Invoice Defaults</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pre-fill new invoices and quotes with these values. Users can override them per document.
        </p>
      </div>

      {/* Invoice settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Invoice Settings</CardTitle>
          </div>
          <CardDescription className="text-xs">Default values applied when creating a new invoice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5 max-w-xs">
            <Label htmlFor="payment-terms">Default Payment Terms (days)</Label>
            <Input
              id="payment-terms"
              type="number"
              min={0}
              max={365}
              value={form.paymentTermsDays}
              onChange={(e) => patch("paymentTermsDays", parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Sets the due date to {form.paymentTermsDays} days after the issue date.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="invoice-notes">Default Invoice Notes</Label>
            <Textarea
              id="invoice-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => patch("notes", e.target.value)}
              placeholder="e.g. Thank you for your business!"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="terms">Default Terms &amp; Conditions</Label>
            <Textarea
              id="terms"
              rows={4}
              value={form.terms}
              onChange={(e) => patch("terms", e.target.value)}
              placeholder="e.g. Payment due within the agreed period. Late fees may apply."
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="tax-inclusive">Tax-inclusive prices by default</Label>
              <p className="text-xs text-muted-foreground">
                When on, new invoices treat line prices as tax-inclusive (tax is
                back-calculated out of the total). Can be overridden per invoice.
              </p>
            </div>
            <Switch
              id="tax-inclusive"
              checked={form.taxInclusive}
              onCheckedChange={(v) => patch("taxInclusive", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quote settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <QuoteIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Quote Settings</CardTitle>
          </div>
          <CardDescription className="text-xs">Default validity period for new quotes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5 max-w-xs">
            <Label htmlFor="quote-validity">Quote Validity (days)</Label>
            <Input
              id="quote-validity"
              type="number"
              min={1}
              max={365}
              value={form.quotesValidDays}
              onChange={(e) => patch("quotesValidDays", parseInt(e.target.value) || 30)}
            />
            <p className="text-xs text-muted-foreground">
              Quotes expire {form.quotesValidDays} days after the issue date.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Defaults"}
        </Button>
      </div>
    </div>
  );
}
