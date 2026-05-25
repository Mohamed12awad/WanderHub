import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { recordInvoicePayment } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { PaymentMethod } from "@/types/types";

interface Props {
  invoiceId: string;
  currency: string;
  onSuccess: () => void;
}

const RecordPaymentDialog: React.FC<Props> = ({ invoiceId, currency, onSuccess }) => {
  const { toast } = useToast();
  const { tr } = useLanguage();
  const f = tr.finance;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setMethod("cash");
    setReference("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await recordInvoicePayment(invoiceId, {
        amount: amt,
        currency,
        date,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      toast({ title: "Payment recorded." });
      reset();
      setOpen(false);
      onSuccess();
    } catch {
      toast({ title: "Failed to record payment", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 px-4">
          <DollarSign className="h-3.5 w-3.5 me-1" />
          {f.recordPayment}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{f.recordPayment}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{f.amount} ({currency})</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{f.paymentDate}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{f.paymentMethod}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(f.paymentMethods).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{f.paymentReference}</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. cheque no, transfer ID" />
          </div>
          <div className="space-y-2">
            <Label>{f.notes}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tr.common.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tr.common.loading : tr.common.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
