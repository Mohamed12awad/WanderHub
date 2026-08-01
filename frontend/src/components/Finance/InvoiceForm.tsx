import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { StickyFormBar } from "@/components/common/StickyFormBar";
import { useQuery } from "@tanstack/react-query";
import { getCostCenters, getCustomers, getDeals, getDealById, getInvoiceById, createInvoice, updateInvoice, getProjects, getInvoiceDefaults } from "@/utils/api";
import LineItemsTable, { LineItemRow, computeTotals } from "./LineItemsTable";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { InvoiceStatus } from "@/types/types";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { CURRENCIES } from "@/utils/constants";
import DynamicFields from "@/components/common/DynamicFields";
import { toCustomFieldValues } from "@/utils/customFields";
import { useUnsavedChangesSnapshot } from "@/hooks/useUnsavedChangesGuard";

async function fetchExchangeRate(baseCurrency: string, toCurrency: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}&to=${toCurrency}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates?.[toCurrency] ?? null;
  } catch {
    return null;
  }
}

const InvoiceForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const cloneData = !id ? (location.state as any)?.clone : undefined;
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tr, formatCurrency } = useLanguage();
  const f = tr.finance;
  const { baseCurrency } = useOrgSettings();

  const dealParam = searchParams.get("deal");
  const [title, setTitle] = useState(cloneData?.title ?? "");
  const [customer, setCustomer] = useState(cloneData?.customer ?? searchParams.get("customer") ?? "");
  const [customerLabel, setCustomerLabel] = useState("");
  const [deal, setDeal] = useState(cloneData?.deal ?? dealParam ?? "none");
  const [dealLabel, setDealLabel] = useState("");
  const [project, setProject] = useState(cloneData?.project ?? "none");
  const [projectLabel, setProjectLabel] = useState("");
  const [costCenterId, setCostCenterId] = useState(cloneData?.costCenterId ?? "none");
  const [costCenterLabel, setCostCenterLabel] = useState(cloneData?.costCenterLabel ?? "");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [currency, setCurrency] = useState(cloneData?.currency ?? "EGP");
  const [taxRate, setTaxRate] = useState<number>(cloneData?.taxRate ?? 0);
  const [taxInclusive, setTaxInclusive] = useState<boolean>(cloneData?.taxInclusive ?? false);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
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
  const [exchangeRate, setExchangeRate] = useState<number | "">("");
  const [fetchingRate, setFetchingRate] = useState(false);
  const [initializing, setInitializing] = useState(Boolean(!isEdit && dealParam && !cloneData));
  // Defers the unsaved-changes baseline until the workspace tax-mode default has
  // been applied, so seeding it doesn't mark a pristine new invoice as dirty.
  const [loadingDefaults, setLoadingDefaults] = useState(Boolean(!isEdit && !cloneData));

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

  const fetchProjects = useCallback(
    (q: string) =>
      getProjects({ page: 1, limit: 20, q }).then((r) =>
        [
          { value: "none", label: "None" },
          ...(Array.isArray(r.data) ? r.data : r.data?.data ?? []).map((p: { _id: string; name: string }) => ({ value: p._id, label: p.name })),
        ]
      ),
    [],
  );
  const fetchCostCenters = useCallback(
    (q: string) =>
      getCostCenters({ q, isActive: true }).then((r) => [
        { value: "none", label: "None" },
        ...(r.data ?? []).map((cc) => ({ value: cc._id, label: `${cc.code} — ${cc.name}` })),
      ]),
    [],
  );

  // Pre-fill from deal when creating new invoice from a deal's page
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
    }).catch((e: any) => {
      toast({ title: e?.response?.data?.message ?? "Failed to load deal data", variant: "destructive" });
    }).finally(() => setInitializing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealParam, isEdit]);

  // Seed the tax mode from the workspace Invoice Defaults when creating a brand-
  // new invoice (not on edit, and not when cloning — a clone carries its own flag).
  useEffect(() => {
    if (isEdit || cloneData) return;
    getInvoiceDefaults()
      .then((res) => {
        const def = (res.data as { taxInclusive?: boolean } | null)?.taxInclusive;
        if (typeof def === "boolean") setTaxInclusive(def);
      })
      .catch(() => {/* non-fatal: fall back to the false default */})
      .finally(() => setLoadingDefaults(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch today's rate whenever the currency changes (create mode only)
  useEffect(() => {
    if (isEdit || currency === baseCurrency) { setExchangeRate(""); return; }
    setFetchingRate(true);
    fetchExchangeRate(baseCurrency, currency).then((rate) => {
      setExchangeRate(rate ?? "");
    }).finally(() => setFetchingRate(false));
   
  }, [currency, isEdit, baseCurrency]);

  const { data: invoiceData } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => getInvoiceById(id!),
    enabled: isEdit
  });

  useEffect(() => {
    if (!invoiceData?.data?.invoice) return;
    const inv = invoiceData.data.invoice;
    setTitle(inv.title);
    setCustomer(inv.customer._id);
    setCustomerLabel(inv.customer.name ?? "");
    setDeal(inv.deal?._id ?? "none");
    setDealLabel(inv.deal?.title ?? "None");
    setProject(inv.project?._id ?? "none");
    setProjectLabel(inv.project?.name ?? "None");
    setCostCenterId(inv.costCenter?._id ?? "none");
    setCostCenterLabel(inv.costCenter ? `${inv.costCenter.code} — ${inv.costCenter.name}` : "None");
    setStatus(inv.status);
    setCurrency(inv.currency);
    setTaxRate(inv.taxRate);
    setTaxInclusive(inv.taxInclusive ?? false);
    setIssueDate(inv.issueDate ? inv.issueDate.split("T")[0] : "");
    setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
    setNotes(inv.notes ?? "");
    setTerms(inv.terms ?? "");
    setItems(inv.items.map((i: LineItemRow) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      ...(i.taxRate !== undefined && i.taxRate !== null ? { taxRate: i.taxRate } : {}),
      ...(i.productId ? { productId: i.productId } : {}),
    })));
    setExchangeRate(inv.exchangeRate ?? "");
    setCustomFields(toCustomFieldValues(inv.customFields));
  }, [invoiceData]);

  const { subtotal, tax, total } = computeTotals(items, taxRate, taxInclusive);
  const { allowNavigation, resetSnapshot } = useUnsavedChangesSnapshot(
    { title, customer, deal, project, costCenterId, status, currency, exchangeRate, taxRate, taxInclusive, issueDate, dueDate, notes, terms, items, customFields },
    { enabled: isEdit ? !!invoiceData?.data?.invoice : !initializing && !fetchingRate && !loadingDefaults },
  );

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
        project: project && project !== "none" ? project : undefined,
        costCenterId: costCenterId && costCenterId !== "none" ? costCenterId : null,
        status,
        currency,
        exchangeRate: currency !== baseCurrency && exchangeRate !== "" ? Number(exchangeRate) : undefined,
        taxRate,
        taxInclusive,
        issueDate: issueDate || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        items,
        customFields,
      };
      const res = isEdit ? await updateInvoice(id!, payload) : await createInvoice(payload);
      const newId = (res as any)?.data?._id ?? id;
      allowNavigation();
      resetSnapshot();
      navigate(newId ? `/finance/invoices/${newId}` : "/finance/invoices");
    } catch {
      toast({ title: "Failed to save invoice", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityFormPage
      title={isEdit ? "Edit Invoice" : f.newInvoice}
      backHref="/finance/invoices"
      breadcrumb={[
        { label: "Invoices", href: "/finance/invoices" },
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
                <Label>Project (optional)</Label>
                <AsyncSearchableSelect
                  value={project}
                  onChange={setProject}
                  fetchFn={fetchProjects}
                  selectedLabel={projectLabel}
                  placeholder="None"
                  searchPlaceholder="Search projects..."
                />
              </div>
              <div className="space-y-2">
                <Label>Cost Center (optional)</Label>
                <AsyncSearchableSelect
                  value={costCenterId}
                  onChange={setCostCenterId}
                  fetchFn={fetchCostCenters}
                  selectedLabel={costCenterLabel}
                  placeholder="None"
                  searchPlaceholder="Search cost centers..."
                  onSelectItem={(item) => setCostCenterLabel(item.label)}
                />
              </div>
              <div className="space-y-2">
                <Label>{f.status}</Label>
                <Select key={status} value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
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
              {currency !== baseCurrency && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Exchange Rate
                    <span className="text-xs text-muted-foreground font-normal">1 {baseCurrency} =</span>
                    {fetchingRate && <span className="text-xs text-muted-foreground animate-pulse">Fetching…</span>}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="e.g. 50.5"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value === "" ? "" : Number(e.target.value))}
                      className="max-w-[160px]"
                    />
                    <span className="text-sm text-muted-foreground">{currency}</span>
                  </div>
                </div>
              )}
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
                  {formatCurrency(subtotal, currency, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <label className="flex gap-8 items-center cursor-pointer select-none">
                <span className="text-muted-foreground">{f.taxInclusive}</span>
                <span className="w-32 flex justify-end">
                  <Checkbox checked={taxInclusive} onCheckedChange={(v) => setTaxInclusive(v === true)} />
                </span>
              </label>
              <div className="flex gap-8">
                <span className="text-muted-foreground">{f.tax}</span>
                <span className="font-medium w-32 text-right">
                  {formatCurrency(tax, currency, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline gap-8 border-t pt-1">
                <span className="font-medium">{f.total}</span>
                <span className="w-32 text-right text-xl font-bold tabular-nums">
                  {formatCurrency(total, currency, { maximumFractionDigits: 2 })}
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
              <DynamicFields module="invoices" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
            </div>

          <StickyFormBar isSubmitting={saving} onCancel={() => navigate("/finance/invoices")} />
        </div>
      </form>
    </EntityFormPage>
  );
};

export default InvoiceForm;
