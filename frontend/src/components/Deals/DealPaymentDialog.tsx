import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BadgeDollarSign } from "lucide-react";
import { useQuery, useQueryClient } from "react-query";
import { getInvoices, createInvoice, recordInvoicePayment } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Invoice } from "@/types/types";

interface Props {
  dealId: string;
  customerId: string;
  dealTitle: string;
  dealPrice: number;
  currency: string;
}

export const DealPaymentDialog: React.FC<Props> = ({
  dealId, customerId, dealTitle, dealPrice, currency,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [invoiceId, setInvoiceId] = useState("__new__");
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState("cash");
  const [paymentCurrency, setPaymentCurrency] = useState(currency || "USD");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");

  const { data: invoicesData } = useQuery(
    ["invoices", { deal: dealId }],
    () => getInvoices({ deal: dealId }),
    { enabled: open }
  );
  const invoices: Invoice[] = invoicesData?.data ?? [];
  const openInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "cancelled"
  );

  const reset = () => {
    setInvoiceId("__new__");
    setAmount("");
    setMethod("cash");
    setPaymentCurrency(currency || "USD");
    setDate(new Date().toISOString().split("T")[0]);
    setReference("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Amount must be greater than 0", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let targetInvoiceId = invoiceId;

      if (targetInvoiceId === "__new__") {
        const res = await createInvoice({
          title: dealTitle,
          customer: customerId,
          deal: dealId,
          items: [{ description: dealTitle, quantity: 1, unitPrice: dealPrice, discount: 0 }],
          taxRate: 0,
          currency: paymentCurrency,
          issueDate: date,
        });
        targetInvoiceId = res.data._id;
      }

      await recordInvoicePayment(targetInvoiceId, {
        amount: amt,
        currency: paymentCurrency,
        date,
        method,
        reference: reference.trim() || undefined,
      });

      queryClient.invalidateQueries(["deals", dealId]);
      queryClient.invalidateQueries(["invoices"]);
      queryClient.invalidateQueries(["payments"]);

      toast({ title: "Payment recorded successfully." });
      reset();
      setOpen(false);
    } catch {
      toast({ title: "Failed to record payment", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-4">
          <BadgeDollarSign className="h-3.5 w-3.5 me-1" />Make Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Invoice</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">Auto-create invoice from deal</SelectItem>
                {openInvoices.map((inv) => (
                  <SelectItem key={inv._id} value={inv._id}>
                    {inv.invoiceNumber} — {(inv.total - inv.totalPaid).toLocaleString()} {inv.currency} outstanding
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {invoiceId === "__new__" && (
              <p className="text-xs text-muted-foreground">
                A new invoice will be created for this deal before the payment is recorded.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dp-amount">Amount</Label>
              <Input
                id="dp-amount"
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EGP">EGP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dp-date">Date</Label>
              <Input
                id="dp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dp-ref">
              Reference <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="dp-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Cheque #, transfer ID…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
