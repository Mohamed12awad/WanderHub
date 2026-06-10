import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { TaxRateSelect } from "@/components/common/TaxRateSelect";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { StickyFormBar } from "@/components/common/StickyFormBar";
import { useQuery } from "@tanstack/react-query";
import { getCustomers, getDeals, getDealById, getQuoteById, createQuote, updateQuote } from "@/utils/api";
import LineItemsTable, { LineItemRow, computeTotals } from "./LineItemsTable";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { QuoteStatus } from "@/types/types";
import DynamicFields from "@/components/common/DynamicFields";
import { toCustomFieldValues } from "@/utils/customFields";

const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"];

const QuoteForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const cloneData = !id ? (location.state as any)?.clone : undefined;
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tr } = useLanguage();
  const f = tr.finance;

  const dealParam = searchParams.get("deal");
  const [title, setTitle] = useState(cloneData?.title ?? "");
  const [customer, setCustomer] = useState(cloneData?.customer ?? searchParams.get("customer") ?? "");
  const [customerLabel, setCustomerLabel] = useState("");
  const [deal, setDeal] = useState(cloneData?.deal ?? dealParam ?? "none");
  const [dealLabel, setDealLabel] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [currency, setCurrency] = useState(cloneData?.currency ?? "USD");
  const [taxRate, setTaxRate] = useState<number>(cloneData?.taxRate ?? 0);
  const [validUntil, setValidUntil] = useState(cloneData?.validUntil ?? "");
  const [notes, setNotes] = useState(cloneData?.notes ?? "");
  const [terms, setTerms] = useState(cloneData?.terms ?? "");
  const [items, setItems] = useState<LineItemRow[]>(
    cloneData?.items?.length
      ? cloneData.items
      : [{ description: "", quantity: 1, unitPrice: 0, discount: 0 }]
  );
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    cloneData?.customFields ? toCustomFieldValues(cloneData.customFields) : {},
  );
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(
    (q: string) =>
      getCustomers({ page: 1, limit: 20, q }).then((r) =>
        (r.data as any).data.map((c: { _id: string; name: string }) => ({ value: c._id, label: c.name }))
      ),
    [],
  );

  const fetchDeals = useCallback(
    (q: string) =>
      getDeals({ page: 1, limit: 20, q }).then((r) =>
        [
          { value: "none", label: "None" },
          ...(r.data as any).data.map((d: { _id: string; title: string }) => ({ value: d._id, label: d.title })),
        ]
      ),
    [],
  );

  // Pre-fill from deal when creating new quote from a deal's page
  useEffect(() => {
    if (isEdit || !dealParam) return;
    getDealById(dealParam).then(({ data }) => {
      const d = data.deal;
      if (!title) setTitle(d.title ?? "");
      if (!customer && d.customer?._id) {
        setCustomer(d.customer._id);
        setCustomerLabel(d.customer.name ?? "");
      }
      if (d.title) setDealLabel(d.title);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealParam, isEdit]);

  const { data: quoteData } = useQuery({
    queryKey: ["quotes", id],
    queryFn: () => getQuoteById(id!),
    enabled: isEdit
  });

  useEffect(() => {
    if (!quoteData?.data) return;
    const q = quoteData.data;
    setTitle(q.title);
    setCustomer(q.customer._id);
    setCustomerLabel(q.customer.name ?? "");
    setDeal(q.deal?._id ?? "none");
    setDealLabel(q.deal?.title ?? "None");
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
      ...(i.taxRate !== undefined && i.taxRate !== null ? { taxRate: i.taxRate } : {}),
      ...(i.productId ? { productId: i.productId } : {}),
    })));
    setCustomFields(toCustomFieldValues(q.customFields));
  }, [quoteData]);

  const { subtotal, tax, total } = computeTotals(items, taxRate);

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
        customFields,
      };
      const res = isEdit ? await updateQuote(id!, payload) : await createQuote(payload);
      const newId = (res as any)?.data?._id ?? id;
      navigate(newId ? `/finance/quotes/${newId}` : "/finance/quotes");
    } catch {
      toast({ title: "Failed to save quote", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityFormPage
      title={isEdit ? "Edit Quote" : f.newQuote}
      backHref="/finance/quotes"
      breadcrumb={[
        { label: "Quotes", href: "/finance/quotes" },
        { label: isEdit ? "Edit" : "New" },
      ]}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{f.customer} *</Label>
                <AsyncSearchableSelect
                  value={customer}
                  onChange={setCustomer}
                  fetchFn={fetchCustomers}
                  selectedLabel={customerLabel}
                  placeholder="Select customer"
                  searchPlaceholder="Search customers..."
                />
              </div>
              <div className="space-y-2">
                <Label>Deal (optional)</Label>
                <AsyncSearchableSelect
                  value={deal}
                  onChange={setDeal}
                  fetchFn={fetchDeals}
                  selectedLabel={dealLabel}
                  placeholder="None"
                  searchPlaceholder="Search deals..."
                />
              </div>
              <div className="space-y-2">
                <Label>{f.status}</Label>
                <Select key={status} value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}>
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
                <TaxRateSelect value={taxRate} onChange={setTaxRate} compact />
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground">{f.tax}</span>
                <span className="font-medium w-32 text-right">
                  {tax.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </span>
              </div>
              <div className="flex items-baseline gap-8 border-t pt-1">
                <span className="font-medium">{f.total}</span>
                <span className="w-32 text-right text-xl font-bold tabular-nums">
                  {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{f.notes}</Label>
                <AutoTextarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  minRows={3}
                  placeholder="Internal notes…"
                />
              </div>
              <div className="space-y-2">
                <Label>{f.terms}</Label>
                <AutoTextarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  minRows={3}
                  placeholder="Terms & conditions…"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <DynamicFields module="quotes" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
            </div>

          <StickyFormBar isSubmitting={saving} onCancel={() => navigate("/finance/quotes")} />
        </div>
      </form>
    </EntityFormPage>
  );
};

export default QuoteForm;
