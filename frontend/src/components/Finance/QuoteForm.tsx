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
import { getCustomers, getDeals, getQuoteById, createQuote, updateQuote } from "@/utils/api";
import LineItemsTable, { LineItemRow } from "./LineItemsTable";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { QuoteStatus } from "@/types/types";

const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"];

const QuoteForm: React.FC = () => {
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
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<LineItemRow[]>([
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const { data: customersData } = useQuery("customers", () => getCustomers());
  const { data: dealsData } = useQuery("deals", () => getDeals());
  const { data: quoteData } = useQuery(
    ["quotes", id],
    () => getQuoteById(id!),
    { enabled: isEdit }
  );

  useEffect(() => {
    if (!quoteData?.data) return;
    const q = quoteData.data;
    setTitle(q.title);
    setCustomer(q.customer._id);
    setDeal(q.deal?._id ?? "none");
    setStatus(q.status);
    setCurrency(q.currency);
    setTaxRate(q.taxRate);
    setValidUntil(q.validUntil ? q.validUntil.split("T")[0] : "");
    setNotes(q.notes ?? "");
    setTerms(q.terms ?? "");
    setItems(q.items.map((i: LineItemRow) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
    })));
  }, [quoteData]);

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
        deal: deal && deal !== "none" ? deal : undefined,
        status,
        currency,
        taxRate,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        items,
      };
      if (isEdit) {
        await updateQuote(id!, payload);
      } else {
        await createQuote(payload);
      }
      navigate("/finance/quotes");
    } catch {
      toast({ title: "Failed to save quote", variant: "destructive" });
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
              <Link to="/finance/quotes"><CircleArrowLeft /></Link>
              {isEdit ? "Edit Quote" : f.newQuote}
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
                <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(f.quoteStatuses).map(([k, v]) => (
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
                <Label>{f.validUntil}</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
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

export default QuoteForm;
