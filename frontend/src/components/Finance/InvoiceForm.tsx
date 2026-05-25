import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CircleArrowLeft } from "lucide-react";
import { useQuery } from "react-query";
import { getCustomers, getDeals, getInvoiceById, createInvoice, updateInvoice } from "@/utils/api";
import LineItemsTable, { LineItemRow } from "./LineItemsTable";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { InvoiceStatus } from "@/types/types";

const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"];

const InvoiceForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tr } = useLanguage();
  const f = tr.finance;

  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState(searchParams.get("customer") ?? "");
  const [deal, setDeal] = useState(searchParams.get("deal") ?? "none");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<LineItemRow[]>([
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const { data: customersData } = useQuery("customers", getCustomers);
  const { data: dealsData } = useQuery("deals", getDeals);
  const { data: invoiceData } = useQuery(
    ["invoices", id],
    () => getInvoiceById(id!),
    { enabled: isEdit }
  );

  useEffect(() => {
    if (!invoiceData?.data?.invoice) return;
    const inv = invoiceData.data.invoice;
    setTitle(inv.title);
    setCustomer(inv.customer._id);
    setDeal(inv.deal?._id ?? "none");
    setStatus(inv.status);
    setCurrency(inv.currency);
    setTaxRate(inv.taxRate);
    setIssueDate(inv.issueDate ? inv.issueDate.split("T")[0] : "");
    setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
    setNotes(inv.notes ?? "");
    setTerms(inv.terms ?? "");
    setItems(inv.items.map((i: LineItemRow) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
    })));
  }, [invoiceData]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discount / 100), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) { toast({ title: "Customer is required", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Add at least one item", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const payload = {
        title,
        customer,
        deal: deal || undefined,
        status,
        currency,
        taxRate,
        issueDate: issueDate || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        items,
      };
      if (isEdit) {
        await updateInvoice(id!, payload);
      } else {
        await createInvoice(payload);
      }
      navigate("/finance/invoices");
    } catch {
      toast({ title: "Failed to save invoice", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const customers = customersData?.data ?? [];
  const deals = dealsData?.data ?? [];

  return (
    <main className="p-4">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Link to="/finance/invoices"><CircleArrowLeft /></Link>
              {isEdit ? "Edit Invoice" : f.newInvoice}
            </CardTitle>
            <Button type="submit" size="sm" className="h-8 px-5" disabled={saving}>
              {saving ? tr.common.loading : tr.common.save}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{f.customer} *</Label>
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: { _id: string; name: string }) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deal (optional)</Label>
                <Select value={deal} onValueChange={setDeal}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {deals.map((d: { _id: string; title: string }) => (
                      <SelectItem key={d._id} value={d._id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{f.status}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(f.invoiceStatuses).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{f.currency}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{f.issueDate}</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{f.dueDate}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{f.items}</Label>
              <LineItemsTable items={items} onChange={setItems} currency={currency} />
            </div>

            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground">{f.subtotal}</span>
                <span className="font-medium w-32 text-right">
                  {subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </span>
              </div>
              <div className="flex gap-8 items-center">
                <span className="text-muted-foreground">{f.taxRate}</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="h-7 w-20 text-right"
                />
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground">{f.tax}</span>
                <span className="font-medium w-32 text-right">
                  {tax.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </span>
              </div>
              <div className="flex gap-8 border-t pt-1 font-semibold">
                <span>{f.total}</span>
                <span className="w-32 text-right">
                  {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{f.notes}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes…"
                />
              </div>
              <div className="space-y-2">
                <Label>{f.terms}</Label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  placeholder="Terms & conditions…"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </main>
  );
};

export default InvoiceForm;
