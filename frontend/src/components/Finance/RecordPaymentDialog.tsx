import React, { useState, useCallback, useEffect, useId } from "react";
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
import { recordInvoicePayment, editInvoicePayment, getAccounts } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { PaymentMethod, InvoicePayment, Account } from "@/types/types";

interface CreateProps {
  mode?: "create";
  invoiceId: string;
  currency: string;
  outstanding?: number;
  onSuccess: () => void;
  disabled?: boolean;
  disabledTitle?: string;
}

interface EditProps {
  mode: "edit";
  invoiceId: string;
  currency: string;
  payment: InvoicePayment;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}

type Props = CreateProps | EditProps;

const RecordPaymentDialog: React.FC<Props> = (props) => {
  const { toast } = useToast();
  const { tr } = useLanguage();
  const fieldId = useId();
  const f = tr.finance;

  const isEdit = props.mode === "edit";
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isEdit ? (props as EditProps).open : internalOpen;
  const setOpen = isEdit ? (props as EditProps).onOpenChange : setInternalOpen;
  const editPayment = isEdit ? (props as EditProps).payment : undefined;
  const outstanding = !isEdit ? (props as CreateProps).outstanding : undefined;

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  /**
   * Whether the user has actually edited something. Deliberately not derived by
   * comparing values against empty: the dialog prefills `amount` with the
   * outstanding balance on open, so a value check would call every untouched
   * dialog dirty and prompt on every Escape.
   */
  const [touched, setTouched] = useState(false);

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    staleTime: 60000
  });
  const accounts: Account[] = accountsData?.data ?? [];

  const reset = useCallback(() => {
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setMethod("cash");
    setReference("");
    setNotes("");
    setAccountId("");
  }, []);

  useEffect(() => {
    if (open && isEdit && editPayment) {
      setAmount(String(editPayment.amount));
      setDate(editPayment.date.split("T")[0]);
      setMethod(editPayment.method);
      setReference(editPayment.reference ?? "");
      setNotes(editPayment.notes ?? "");
      setAccountId(editPayment.accountId ?? "");
    }
    if (open && !isEdit && outstanding && outstanding > 0) {
      setAmount(String(outstanding));
    }
    if (!open && !isEdit) reset();
    if (open) setTouched(false);
  }, [editPayment, isEdit, open, outstanding, reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      amount: amt,
      currency: props.currency,
      date,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
      accountId: accountId || undefined,
    };
    try {
      if (isEdit) {
        const p = (props as EditProps).payment;
        await editInvoicePayment(props.invoiceId, p._id, payload);
        toast({ title: "Payment updated." });
      } else {
        await recordInvoicePayment(props.invoiceId, payload);
        toast({ title: "Payment recorded." });
        reset();
      }
      setOpen(false);
      props.onSuccess();
    } catch {
      toast({ title: isEdit ? "Failed to update payment" : "Failed to record payment", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const dialogContent = (
    <DialogContent
      // Radix dismisses on backdrop click and Escape by default, which threw
      // away a part-entered payment on a stray click with no warning. A click
      // outside is too easy to do by accident to be treated as "discard this".
      onPointerDownOutside={(event) => { if (touched) event.preventDefault(); }}
      onInteractOutside={(event) => { if (touched) event.preventDefault(); }}
      onEscapeKeyDown={(event) => {
        // Escape stays a real exit — it is deliberate — but has to be confirmed
        // once the form holds work. Cancel and the X button are unaffected.
        if (touched && !window.confirm(tr.common.discardChanges)) event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Payment" : f.recordPayment}</DialogTitle>
      </DialogHeader>
      {/* One handler covers every native field; the two Radix selects are
          button-based and do not bubble a change event, so they set it too. */}
      <form onSubmit={handleSubmit} onChange={() => setTouched(true)} className="space-y-4 mt-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {/* These Labels carried no htmlFor and the Inputs no id, so the
                fields had no programmatic label — the same defect the audit
                fixed on the list pages. */}
            <Label htmlFor={`${fieldId}-amount`}>{f.amount} ({props.currency})</Label>
            <Input
              id={`${fieldId}-amount`}
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-date`}>{f.paymentDate}</Label>
            <Input id={`${fieldId}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{f.paymentMethod}</Label>
          <Select value={method} onValueChange={(v) => { setTouched(true); setMethod(v as PaymentMethod); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(f.paymentMethods).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {accounts.length > 0 && (
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={(v) => { setTouched(true); setAccountId(v); }}>
              <SelectTrigger><SelectValue placeholder="Select account (optional)" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name} — {a.type} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
  );

  if (isEdit) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  const createProps = props as CreateProps;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 px-4" disabled={createProps.disabled} title={createProps.disabledTitle}>
          <DollarSign className="h-3.5 w-3.5 me-1" />
          {f.recordPayment}
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};

export default RecordPaymentDialog;
